import { getPool } from "./_db.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED = new Set(["Messages & replies","Bookings & scheduling","Invoices & payments","Follow-ups & leads","Reports & admin","Not sure yet"]);
const MAX_BODY = 15000;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
async function ensureTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS website_leads (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL, business VARCHAR(160) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL, website VARCHAR(400) NOT NULL DEFAULT '',
    handoffs JSONB NOT NULL DEFAULT '[]'::jsonb, weekly_load VARCHAR(40) NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'new',
    email_notified BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const length = Number(req.headers?.["content-length"] || 0);
  if(length > MAX_BODY) return res.status(413).json({error:"Message too large"});
  const b=req.body && typeof req.body==="object" ? req.body : {};
  if(typeof b.trap==="string" && b.trap.trim()) return res.status(200).json({ok:true});
  const name=typeof b.name==="string"?b.name.trim():"";
  const email=typeof b.email==="string"?b.email.trim().toLowerCase():"";
  const business=typeof b.business==="string"?b.business.trim():"";
  const website=typeof b.website==="string"?b.website.trim():"";
  const note=typeof b.note==="string"?b.note.trim():"";
  const weeklyLoad=typeof b.weeklyLoad==="string"?b.weeklyLoad.trim():"";
  const handoffs=Array.isArray(b.handoffs)?[...new Set(b.handoffs)]:[];
  if(name.length<2||name.length>120||!EMAIL.test(email)||email.length>254 ||
     business.length>160||website.length>400||note.length>3000||weeklyLoad.length>40||
     handoffs.length>6||!handoffs.every(v=>typeof v==="string"&&ALLOWED.has(v))||
     (!handoffs.length&&!note)) return res.status(400).json({error:"Please check your details and add a message or task."});
  try {
    const pool=getPool();
    await ensureTable(pool);
    // Prevent accidental rapid duplicates without blocking other people on shared IPs.
    const duplicate=await pool.query(
      "SELECT id FROM website_leads WHERE email=$1 AND name=$2 AND note=$3 AND handoffs=$4::jsonb AND submitted_at > NOW()-INTERVAL '2 minutes' LIMIT 1",
      [email,name,note,JSON.stringify(handoffs)]
    );
    if(duplicate.rows.length) return res.status(200).json({ok:true,received:true});
    const inserted=await pool.query(
      "INSERT INTO website_leads (name,business,email,website,handoffs,weekly_load,note) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING id",
      [name,business,email,website,JSON.stringify(handoffs),weeklyLoad,note]
    );
    // Database persistence is the source of truth. Email is an optional alert.
    if(process.env.RESEND_API_KEY && process.env.LEAD_FROM_EMAIL) {
      try {
        const html = `<h2>New website inquiry #${inserted.rows[0].id}</h2>
          <p><b>Name:</b> ${escapeHtml(name)}<br/><b>Business:</b> ${escapeHtml(business)}<br/>
          <b>Email:</b> ${escapeHtml(email)}<br/><b>Website:</b> ${escapeHtml(website)}<br/>
          <b>Tasks:</b> ${escapeHtml(handoffs.join(", "))}<br/><b>Weekly load:</b> ${escapeHtml(weeklyLoad)}</p>
          <p><b>Message:</b></p><p style="white-space:pre-wrap">${escapeHtml(note)}</p>`;
        const response = await fetch("https://api.resend.com/emails",{
          method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
          body:JSON.stringify({
            from:process.env.LEAD_FROM_EMAIL,
            to:["agent@merqato.digital"],
            reply_to:email,
            subject:"New Palawan Collective lead: "+name,
            html
          })
        });
        if(response.ok) await pool.query("UPDATE website_leads SET email_notified=true WHERE id=$1",[inserted.rows[0].id]);
        else console.error("Lead notification rejected",response.status);
      } catch(err){console.error("Lead notification failed",err);}
    }
    return res.status(201).json({ok:true,received:true});
  } catch(err) {
    console.error("Lead storage error",err);
    return res.status(503).json({error:"Unable to send right now. Please email agent@merqato.digital."});
  }
}

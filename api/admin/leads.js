import { getPool } from "../_db.js";
import { requireAdmin } from "../_auth.js";
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(!requireAdmin(req,res)) return;
  try{
    const pool=getPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS website_leads (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL, business VARCHAR(160) NOT NULL DEFAULT '',
      email VARCHAR(254) NOT NULL, website VARCHAR(400) NOT NULL DEFAULT '',
      handoffs JSONB NOT NULL DEFAULT '[]'::jsonb, weekly_load VARCHAR(40) NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'new',
      email_notified BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    if(req.method==="GET"){
      const result=await pool.query("SELECT id,name,business,email,website,handoffs,weekly_load AS \"weeklyLoad\",note,status,email_notified AS \"emailNotified\",submitted_at AS \"submittedAt\" FROM website_leads ORDER BY submitted_at DESC LIMIT 300");
      return res.status(200).json({leads:result.rows});
    }
    if(req.method==="PATCH"){
      const id=Number(req.body?.id),status=req.body?.status;
      if(!Number.isSafeInteger(id)||id<1||!["new","contacted","closed"].includes(status))
        return res.status(400).json({error:"Invalid update"});
      const result=await pool.query("UPDATE website_leads SET status=$1 WHERE id=$2 RETURNING id",[status,id]);
      if(!result.rows.length)return res.status(404).json({error:"Lead not found"});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(err){console.error("Lead inbox error",err);return res.status(503).json({error:"Lead inbox unavailable"});}
}

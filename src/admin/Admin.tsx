import InteractiveEditor from "./InteractiveEditor";
import { useEffect, useState } from "react";
import { api } from "./api";
import { THEME_DEFAULT } from "../content";
import type { FaqItem, Section, Theme } from "../content";

type View = "Inbox" | "Pages" | "Brand" | "Media" | "FAQ";
type Editable = Section & { content: Record<string, any> };
type Media = { id: number; filename: string; alt: string; size: number; url: string; kind?: string };
type ProjectMedia = { url: string; kind: "image" | "video"; poster?: string };
type ProjectItem = { title: string; description: string; image: string; href: string; media: ProjectMedia[] };
type LinkItem = { label: string; href: string; note: string };
const essentials = ["header", "hero", "footer"];
const input = "w-full rounded-xl border border-[#d9ded8] bg-white px-3.5 py-3 text-sm text-[#193b37] outline-none focus:border-[#155b58] focus:ring-2 focus:ring-[#155b58]/10";
const btn = "rounded-xl bg-[#144c49] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d3835] disabled:opacity-40 transition";
const outline = "rounded-xl border border-[#d2dcd6] bg-white px-4 py-2.5 text-sm font-medium text-[#254440] hover:border-[#155b58] transition";
const card = "rounded-2xl border border-[#e1e6e1] bg-white shadow-[0_8px_32px_-25px_rgba(0,0,0,.2)]";
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-[#526963]">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-[#70847e]">{hint}</span>}</label>;
}
function Text({ label, value, onChange, multiline = false, hint }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string }) {
  return <Field label={label} hint={hint}>{multiline ? <textarea rows={3} value={value} onChange={e=>onChange(e.target.value)} className={input+" resize-y"} /> : <input value={value} onChange={e=>onChange(e.target.value)} className={input}/>}</Field>;
}
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy,setBusy]=useState(false);
  return <div className="min-h-screen bg-[#f5f7f3] grid place-items-center p-5 text-[#173b37]">
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);const result=await api.login(password);setBusy(false);if(result.ok)onSuccess();else setError(result.error||"Incorrect credentials");}} className={card+" p-8 w-full max-w-md"}>
      <div className="text-[10px] uppercase tracking-[.28em] font-semibold text-[#5b7970]">Palawan Collective</div><h1 className="mt-4 text-3xl font-serif">Welcome back.</h1>
      <p className="mt-2 text-sm text-[#63746e]">Manage everything your visitors see.</p>
      <div className="mt-6"><Field label="Admin password"><input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} className={input} required /></Field></div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className={btn+" mt-5 w-full"}>{busy?"Signing in…":"Open studio"}</button>
    </form>
  </div>;
}
const IMAGE_TYPES = ["image/png","image/jpeg","image/webp","image/gif","image/avif"];
const VIDEO_TYPES = ["video/mp4","video/quicktime","video/webm","video/x-m4v"];
// R2 requires every chunk except the last to be at least 5 MB.
const PART_SIZE = 8 * 1024 * 1024;

function formatSize(bytes:number){
  if(!bytes) return "";
  if(bytes < 1024*1024) return Math.max(1,Math.round(bytes/1024))+" KB";
  return (bytes/1024/1024).toFixed(1)+" MB";
}

/** Uploads a file straight to media storage, in chunks, so phone videos work. */
async function uploadFile(file:File, onProgress:(pct:number)=>void){
  const mime = file.type;
  if(!IMAGE_TYPES.includes(mime) && !VIDEO_TYPES.includes(mime))
    throw new Error("Choose an image (PNG, JPG, WEBP, GIF) or a video (MP4, MOV, WEBM).");
  const ticket = await api.mediaTicket({filename:file.name,mime,size:file.size});
  if(!ticket.ok) throw new Error(ticket.error||"Upload could not start.");
  const {tickets,key} = ticket.json as any;
  const start = await fetch(tickets.startUrl,{method:"POST"});
  if(!start.ok) throw new Error("Upload could not start.");
  const {uploadId} = await start.json();
  const parts:{partNumber:number;etag:string}[] = [];
  let partNumber = 1;
  for(let offset=0; offset<file.size || partNumber===1; offset+=PART_SIZE){
    const blob = file.slice(offset, Math.min(offset+PART_SIZE, file.size));
    const url = `${tickets.partUrl}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;
    const res = await fetch(url,{method:"PUT",body:blob});
    if(!res.ok) throw new Error("Upload failed. Please try again.");
    const data = await res.json();
    parts.push({partNumber,etag:data.etag});
    onProgress(Math.min(99,Math.round(((offset+blob.size)/Math.max(file.size,1))*100)));
    if(offset+PART_SIZE>=file.size) break;
    partNumber++;
  }
  const done = await fetch(`${tickets.completeUrl}&uploadId=${encodeURIComponent(uploadId)}`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({parts})});
  if(!done.ok) throw new Error("Upload could not be finished.");
  const saved = await api.mediaRegister({
    key, filename:file.name, mime,
    alt:file.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," "),
    size:file.size,
  });
  if(!saved.ok) throw new Error(saved.error||"Upload failed.");
  onProgress(100);
  return saved.json as any;
}

function MediaPanel({ onPick, pickMode }: { onPick?: (m:Media)=>void; pickMode?: boolean }) {
  const [items,setItems]=useState<Media[]>([]);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const [message,setMessage]=useState("");
  const load=async()=>{const x=await api.media();if(x.ok)setItems(x.json?.media||[]);else setMessage(x.error||"Media library unavailable");};
  useEffect(()=>{void load();},[]);
  async function upload(files:FileList|null){
    if(!files||!files.length) return;
    setBusy(true);setMessage("");
    try{
      for(const file of Array.from(files)){
        setProgress(0);
        const saved = await uploadFile(file,p=>setProgress(p));
        setMessage(`${file.name} uploaded`);
        if(onPick&&pickMode) onPick({id:saved.id,filename:file.name,alt:file.name,size:file.size,url:saved.url,kind:saved.kind});
      }
      await load();
    }catch(err:any){
      setMessage(err?.message||"Upload failed");
    }finally{
      setBusy(false);setProgress(0);
    }
  }
  return <div className="space-y-5">
    <div className={card+" p-5 sm:p-7"}>
      <h2 className="font-serif text-2xl text-[#1d3e39]">Media library</h2><p className="mt-2 text-sm text-[#657770]">Upload photos and videos from your phone or computer. Files are stored safely and can be reused in any section.</p>
      <label className="mt-5 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#a7c0b5] bg-[#f5f9f6] px-5 py-8 text-center text-sm font-semibold text-[#245e53] hover:bg-[#ebf4ee]">
        {busy?`Uploading… ${progress}%`:"＋ Choose photos or videos from your device"}
        <input type="file" multiple accept={[...IMAGE_TYPES,...VIDEO_TYPES].join(",")} className="sr-only" disabled={busy} onChange={e=>{const f=e.target.files;if(f&&f.length)void upload(f);e.target.value="";}} />
      </label>
      {busy && <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e6ece5]"><div className="h-full bg-[#155b58] transition-all" style={{width:progress+"%"}}/></div>}
      <p className="mt-2 text-xs text-[#71867e]">Photos: PNG, JPG, WEBP, GIF · Videos: MP4, MOV, WEBM · Up to 25 MB per photo, 500 MB per video</p>
      {message && <p role="status" className="mt-3 text-sm text-[#275b52]">{message}</p>}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map(m=><div key={m.id} className={card+" overflow-hidden"}>
        {m.kind==="video"
          ? <div className="aspect-[4/3] w-full bg-[#1d3e39] grid place-items-center text-white text-2xl">▶<span className="sr-only">Video</span></div>
          : <img src={m.url} alt={m.alt||m.filename} loading="lazy" className="aspect-[4/3] w-full object-cover bg-[#e9f0ea]"/>}
        <div className="p-3"><p className="truncate text-xs font-medium text-[#244640]" title={m.filename}>{m.filename}</p><p className="mt-1 text-[11px] text-[#789086]">{m.kind==="video"?"Video":"Photo"} · {formatSize(m.size)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onPick && <button className={btn+" !px-3 !py-2 !text-xs"} onClick={()=>onPick(m)}>{pickMode?"Use this":"Use"}</button>}
            <button className={outline+" !px-3 !py-2 !text-xs"} onClick={()=>{void navigator.clipboard?.writeText(/^https?:/.test(m.url)?m.url:location.origin+m.url);setMessage("File URL copied");}}>Copy URL</button>
            <button className="text-xs text-[#a34135] underline" onClick={async()=>{if(!confirm("Delete this file? Sections using it will show a broken file."))return;const x=await api.mediaDelete(m.id);setMessage(x.ok?"File deleted":x.error||"Delete failed");if(x.ok)void load();}}>Delete</button>
          </div>
        </div>
      </div>)}
    </div>
  </div>;
}
function BrandPanel(){
  const [theme,setTheme]=useState<Theme>(THEME_DEFAULT);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  useEffect(()=>{api.content().then(r=>{if(r.ok && r.json?.theme)setTheme({...THEME_DEFAULT,...r.json.theme,colors:{...THEME_DEFAULT.colors,...r.json.theme.colors},fonts:{...THEME_DEFAULT.fonts,...r.json.theme.fonts}});});},[]);
  const change=(p:Partial<Theme>)=>setTheme(v=>({...v,...p}));
  const colors=["sand","shell","ink","lagoon","deep","coral","foam"];
  const fonts=["brand","serif","sans","hand"];
  return <div className="space-y-5">
    <div className={card+" p-5 sm:p-7 space-y-5"}>
      <div><h2 className="font-serif text-2xl">Identity & typography</h2><p className="text-sm text-[#6b8077] mt-1">Your brand is controlled here, not hardcoded into every page.</p></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Text label="Site name" value={theme.siteName} onChange={v=>change({siteName:v})}/>
        <Text label="Tagline" value={theme.tagline} onChange={v=>change({tagline:v})}/>
      </div>
      <Text label="Logo image URL" hint="Select an uploaded logo from Media, then paste its URL here. Only uploaded image URLs are used as the site logo." value={theme.logoSvg||""} onChange={v=>change({logoSvg:v})}/>
      <div className="grid sm:grid-cols-2 gap-4">
      {fonts.map(k=><Field key={k} label={k+" font"}><select value={theme.fonts[k]||""} onChange={e=>change({fonts:{...theme.fonts,[k]:e.target.value}})} className={input}>
        {Array.from(new Set([theme.fonts[k],"DM Sans","Fraunces","Orbitron","Caveat","Inter","Manrope","Playfair Display","Libre Baskerville","Montserrat","Outfit","Lora"].filter(Boolean))).map(f=><option key={f} value={f}>{f}</option>)}
      </select></Field>)}
      </div>
    </div>
    <div className={card+" p-5 sm:p-7"}>
      <h2 className="font-serif text-2xl">Color palette</h2><p className="mt-1 text-sm text-[#6b8077]">Changing these values updates the public site theme.</p>
      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {colors.map(k=><Field key={k} label={k}><div className="flex gap-2"><input type="color" value={/^#[0-9a-f]{6}$/i.test(theme.colors[k]||"")?theme.colors[k]:"#000000"} onChange={e=>change({colors:{...theme.colors,[k]:e.target.value}})} className="h-12 w-14 rounded-lg border border-[#dde4df] cursor-pointer bg-white p-1"/><input className={input} value={theme.colors[k]||""} onChange={e=>change({colors:{...theme.colors,[k]:e.target.value}})} /></div></Field>)}
      </div>
    </div>
    <div className="flex items-center gap-4"><button className={btn} disabled={busy} onClick={async()=>{setBusy(true);const x=await api.theme(theme);setBusy(false);setMessage(x.ok?"Brand settings saved. Refresh the public site to see changes.":x.error||"Save failed");}}>{busy?"Saving…":"Save brand changes"}</button><span role="status" className="text-sm text-[#55766b]">{message}</span></div>
  </div>;
}
function PagePanel(){
  const [sections,setSections]=useState<Editable[]>([]);
  const [selected,setSelected]=useState("hero");
  const [busy,setBusy]=useState(false);const [msg,setMsg]=useState("");
  const [adding,setAdding]=useState(false);const [type,setType]=useState("content");const [label,setLabel]=useState("");
  const [imagePick,setImagePick]=useState(false);
  const refresh=async()=>{const x=await api.sections();if(!x.ok){setMsg(x.error||"Unable to load");return;}
  const rows=(x.json?.sections||[]) as Editable[];
  const defaults=[["weight","Crack open the coconuts on your list.",10],["how","Three slow steps. That is the whole thing.",20],["tuesday","Same business. Different day.",30],["stories","From people who breathe easier now.",40]] as const;
  const missing=defaults.filter(([key])=>!rows.some(s=>s.key===key)).map(([key,title,sortOrder])=>({key,title,subtitle:"",body:"",sortOrder,content:{}} as Editable));
  setSections([...rows,...missing].map(s=>s.key==="footer"&&s.content.contact==="hello@palawancollective.com"?{...s,content:{...s.content,contact:"agent@merqato.digital"}}:s).sort((a,b)=>a.sortOrder-b.sortOrder));
};
  useEffect(()=>{void refresh();},[]);
  const active=sections.find(s=>s.key===selected);
  function patch(p:Partial<Editable>){setSections(all=>all.map(s=>s.key===selected?{...s,...p}:s));}
  function content(p:Record<string,any>){if(active)patch({content:{...active.content,...p}});}
  async function save(){if(!active)return;setBusy(true);const x=await api.section(active);setBusy(false);setMsg(x.ok?"Saved. Your live site will reflect this change.":x.error||"Save failed");if(x.ok)void refresh();}
  async function remove(){if(!active||essentials.includes(active.key)||!confirm("Delete this section from your live site?"))return;setBusy(true);const x=await api.sectionDelete(active.key);setBusy(false);setMsg(x.ok?"Section deleted":x.error||"Delete failed");if(x.ok){setSelected("hero");void refresh();}}
  async function create(){const key="custom_"+Date.now().toString(36);const newSection:Editable={key,title:label.trim()||"New section",subtitle:"",body:"",sortOrder:sections.length+10,content:{kind:type,items:[],image:"",hidden:false}};
    setBusy(true);const x=await api.section(newSection);setBusy(false);setMsg(x.ok?"Section added. Choose its content and save.":x.error||"Could not add");if(x.ok){setAdding(false);setLabel("");setSelected(key);void refresh();}}
  function updateList(next:ProjectItem[]){content({items:next});}
  const entries:ProjectItem[]=Array.isArray(active?.content?.items)
    ? (active.content.items as any[]).map(i=>({title:i?.title||"",description:i?.description||"",image:i?.image||"",href:i?.href||"",media:Array.isArray(i?.media)?i.media:[]}))
    : [];
  function updateLinks(next:LinkItem[]){content({links:next});}
  const links:LinkItem[]=Array.isArray(active?.content?.links)
    ? (active.content.links as any[]).map(l=>({label:l?.label||"",href:l?.href||"",note:l?.note||""}))
    : [];
  return <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-5">
    <aside className={card+" p-4 h-fit"}>
      <div className="flex items-center justify-between px-2 mb-3"><h2 className="text-sm font-bold text-[#234c43]">Website sections</h2><span className="text-xs text-[#789087]">{sections.length}</span></div>
      <div className="space-y-1">{sections.map(s=><button key={s.key} type="button" onClick={()=>{setSelected(s.key);setImagePick(false);setMsg("");}} className={`w-full rounded-xl text-left px-3 py-3 text-sm flex items-center gap-2 transition ${selected===s.key?"bg-[#e7f1eb] text-[#164f47] font-semibold":"text-[#61766d] hover:bg-[#f4f6f2]"}`}><span className="w-2 h-2 rounded-full bg-[#4b9682] shrink-0"/><span className="truncate">{s.key==="header"?"Header":s.key==="hero"?"Hero":s.key==="footer"?"Footer":s.title||s.key}</span></button>)}</div>
      <button className={outline+" mt-4 w-full"} onClick={()=>setAdding(v=>!v)}>＋ Add section</button>
      {adding && <div className="mt-3 space-y-3 border-t pt-4 border-[#e6ebe5]">
        <Text label="Section heading" value={label} onChange={setLabel}/>
        <Field label="Layout"><select className={input} value={type} onChange={e=>setType(e.target.value)}><option value="content">Text & image</option><option value="portfolio">Portfolio grid</option><option value="cards">Cards grid</option></select></Field>
        <button className={btn+" w-full"} disabled={busy} onClick={()=>void create()}>Create section</button>
      </div>}
    </aside>
    <div className="space-y-4 min-w-0">
    {!active?<div className={card+" p-7 text-[#72867c]"}>Choose a section to start editing.</div>:<div className={card+" p-5 sm:p-7"}>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-[#e6ece5]">
        <div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#81958a]">{active.key}</div><h2 className="mt-1 font-serif text-2xl capitalize">{active.title||active.key}</h2></div>
        <a href={"/#"+(active.key==="hero"?"top":active.key)} target="_blank" rel="noreferrer" className={outline}>View on site ↗</a>
      </div>
      <div className="mt-5 space-y-4">
        {active.key==="header"?<>
          <Text multiline label="Navigation links (one label | #anchor per line)" value={(active.content.links||[]).map((v:any)=>v.label+" | "+v.href).join("\n")} onChange={v=>content({links:v.split("\n").map(line=>line.split("|").map(v=>v.trim())).filter(v=>v.length===2&&v[0]&&v[1]).map(([label,href])=>({label,href}))})}/>
          <div className="grid sm:grid-cols-2 gap-4">
            <Text label="Button label" value={active.content.cta?.label||""} onChange={v=>content({cta:{...active.content.cta,label:v}})}/>
            <Text label="Button destination" value={active.content.cta?.href||""} onChange={v=>content({cta:{...active.content.cta,href:v}})}/>
          </div>
        </>:active.key==="hero"?<>
          <Text label="Small introduction" value={active.content.kicker||""} onChange={v=>content({kicker:v})}/>
          <Text label="Main heading" value={active.content.heading||""} onChange={v=>content({heading:v})}/>
          <Text multiline label="Description" value={active.content.subheading||""} onChange={v=>content({subheading:v})}/>
          <div className="grid sm:grid-cols-2 gap-4">
            <Text label="Button text" value={active.content.cta?.label||""} onChange={v=>content({cta:{...active.content.cta,label:v}})}/>
            <Text label="Button link" value={active.content.cta?.href||""} onChange={v=>content({cta:{...active.content.cta,href:v}})}/>
          </div><Text label="Small note" value={active.content.note||""} onChange={v=>content({note:v})}/>
          <Text label="Hero image URL (optional)" hint="Use an uploaded image URL from Media to replace the turtle illustration." value={active.content.image||""} onChange={v=>content({image:v})}/>
        </>:active.key==="footer"?<>
          <Text label="Tagline" value={active.content.tagline||""} onChange={v=>content({tagline:v})}/>
          <Text label="Copyright" value={active.content.copyright||""} onChange={v=>content({copyright:v})}/>
          <Text label="Contact email" value={active.content.contact||""} onChange={v=>content({contact:v})}/>
        </>:<>
          <Text label="Section title" value={active.title||""} onChange={v=>patch({title:v})}/>
          <Text label="Subtitle" value={active.subtitle||""} onChange={v=>patch({subtitle:v})}/>
          <Text label="Description" multiline value={active.body||""} onChange={v=>patch({body:v})}/>
          <Field label="Layout"><select className={input} value={active.content.kind||"content"} onChange={e=>content({kind:e.target.value})}><option value="content">Text & image</option><option value="portfolio">Portfolio grid</option><option value="cards">Cards grid</option><option value="links">Fast links</option></select></Field>
          <InteractiveEditor section={active} onChange={content}/>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#526963]">Section image</span><button className={outline+" !px-3 !py-2 !text-xs"} onClick={()=>setImagePick(v=>!v)}>{imagePick?"Close library":"Choose upload"}</button></div>
          <Text label="Image URL" hint="Upload photos in the Media tab or choose an existing one here." value={active.content.image||""} onChange={v=>content({image:v})}/>
          {active.content.image && <img src={active.content.image} alt="" className="max-h-56 rounded-xl object-cover" />}
          {imagePick && <MediaPanel pickMode onPick={m=>{content({image:m.url});setImagePick(false);}}/>}
          {active.content.kind==="links" && <div className="space-y-3 border-t pt-5 border-[#e6ece5]">
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold">Fast links</h3><button className={outline} onClick={()=>updateLinks([...links,{label:"New link",href:"",note:""}])}>＋ Add link</button></div>
            <p className="text-xs text-[#789087]">Quick links to your apps, sites and tools. They show up as tiles on the website.</p>
            {links.map((item,i)=><div key={i} className="rounded-xl bg-[#f7f9f6] border border-[#e3eae3] p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs font-bold">Link {i+1}</span><button className="text-xs text-red-700 underline" onClick={()=>updateLinks(links.filter((_,j)=>j!==i))}>Remove</button></div>
              <Text label="Name" value={item.label} onChange={v=>updateLinks(links.map((x,j)=>j===i?{...x,label:v}:x))}/>
              <Text label="URL" value={item.href} onChange={v=>updateLinks(links.map((x,j)=>j===i?{...x,href:v}:x))}/>
              <Text label="Short note (optional)" value={item.note} onChange={v=>updateLinks(links.map((x,j)=>j===i?{...x,note:v}:x))}/>
            </div>)}
          </div>}
          {(active.content.kind==="portfolio"||active.content.kind==="cards") && <div className="space-y-3 border-t pt-5 border-[#e6ece5]">
            <div className="flex justify-between items-center"><h3 className="text-sm font-bold">Portfolio / Cards</h3><button className={outline} onClick={()=>updateList([...entries,{title:"New project",description:"",image:"",href:"",media:[]}])}>＋ Add item</button></div>
            {entries.map((item,i)=><ProjectItemEditor
              key={i}
              item={item}
              index={i}
              total={entries.length}
              onChange={next=>updateList(entries.map((x,j)=>j===i?next:x))}
              onRemove={()=>updateList(entries.filter((_,j)=>j!==i))}
              onMove={dir=>{const a=[...entries];const to=i+dir;if(to<0||to>=a.length)return;[a[i],a[to]]=[a[to],a[i]];updateList(a);}}
            />)}
          </div>}
          <Field label="Display order"><input type="number" className={input} value={active.sortOrder||0} onChange={e=>patch({sortOrder:Number(e.target.value)})}/></Field>
          {!essentials.includes(active.key) && <label className="flex items-center gap-3 text-sm text-[#49645c]"><input type="checkbox" checked={!active.content.hidden} onChange={e=>content({hidden:!e.target.checked})} /> Show this section on the website</label>}
        </>}
      </div>
      <div className="mt-7 pt-5 border-t border-[#e4ece5] flex flex-wrap items-center gap-3">
        <button className={btn} disabled={busy} onClick={()=>void save()}>{busy?"Saving…":"Save changes"}</button>
        {!essentials.includes(active.key)&&<button className="rounded-xl px-3 py-2.5 text-sm text-red-700 hover:bg-red-50" disabled={busy} onClick={()=>void remove()}>Delete section</button>}
        <span role="status" className="text-sm text-[#56796f]">{msg}</span>
      </div>
    </div>}
    </div>
  </div>;
}
function ProjectItemEditor({item,index,total,onChange,onRemove,onMove}:{
  item:ProjectItem; index:number; total:number;
  onChange:(next:ProjectItem)=>void; onRemove:()=>void; onMove:(dir:number)=>void;
}){
  const [picking,setPicking]=useState(false);
  const media:ProjectMedia[]=Array.isArray(item.media)?item.media:[];
  const addMedia=(m:Media)=>{
    if(!m.url) return;
    if(media.some(x=>x.url===m.url)) return;
    onChange({...item,media:[...media,{url:m.url,kind:m.kind==="video"?"video":"image"}]});
    setPicking(false);
  };
  return <div className="rounded-xl bg-[#f7f9f6] border border-[#e3eae3] p-4 space-y-3">
    <div className="flex items-center justify-between"><span className="text-xs font-bold">Project {index+1}</span><button className="text-xs text-red-700 underline" onClick={onRemove}>Remove</button></div>
    <Text label="Project name" value={item.title} onChange={v=>onChange({...item,title:v})}/>
    <Text label="Description" multiline value={item.description} onChange={v=>onChange({...item,description:v})}/>
    <Text label="Project URL" value={item.href} onChange={v=>onChange({...item,href:v})}/>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#526963]">Photos & videos ({media.length})</span>
        <button className={outline+" !px-3 !py-2 !text-xs"} onClick={()=>setPicking(v=>!v)}>{picking?"Close picker":"＋ Add from device"}</button>
      </div>
      {media.length>0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {media.map((m,mi)=><div key={mi} className="relative group overflow-hidden rounded-lg border border-[#e3eae3] bg-white">
          {m.kind==="video"
            ? <div className="aspect-[4/3] bg-[#1d3e39] grid place-items-center text-white text-xl">▶</div>
            : <img src={m.url} alt="" className="aspect-[4/3] w-full object-cover" />}
          <button type="button" aria-label="Remove file" className="absolute top-1 right-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white" onClick={()=>onChange({...item,media:media.filter((_,j)=>j!==mi)})}>Remove</button>
        </div>)}
      </div>}
      <p className="text-xs text-[#789087]">Add several photos and videos per project. The first one becomes the cover.</p>
      {picking && <MediaPanel pickMode onPick={addMedia}/>}
    </div>
    <div className="flex gap-2"><button className={outline+" !text-xs"} disabled={index===0} onClick={()=>onMove(-1)}>Move up</button><button className={outline+" !text-xs"} disabled={index===total-1} onClick={()=>onMove(1)}>Move down</button></div>
  </div>;
}

function FaqPanel(){
  const [items,setItems]=useState<FaqItem[]>([]);
  const [draft,setDraft]=useState({question:"",answer:""});
  const [edit,setEdit]=useState<number|null>(null);
  const [msg,setMsg]=useState("");
  const refresh=async()=>{const x=await api.faq();if(x.ok)setItems(x.json?.faq||[]);else setMsg(x.error||"Unable to load FAQ");};
  useEffect(()=>{void refresh();},[]);
  async function save(){if(!draft.question.trim()||!draft.answer.trim()){setMsg("Enter a question and answer.");return;}const x=edit===null?await api.faqCreate({...draft,sortOrder:items.length}):await api.faqUpdate({id:edit,...draft,sortOrder:items.find(i=>i.id===edit)?.sortOrder||0});setMsg(x.ok?"Saved":x.error||"Save failed");if(x.ok){setDraft({question:"",answer:""});setEdit(null);void refresh();}}
  return <div className="space-y-5">
    <div className={card+" p-5 sm:p-7 space-y-4"}><h2 className="font-serif text-2xl">{edit===null?"Add a question":"Edit question"}</h2><Text label="Question" value={draft.question} onChange={v=>setDraft(d=>({...d,question:v}))}/><Text label="Answer" multiline value={draft.answer} onChange={v=>setDraft(d=>({...d,answer:v}))}/><div className="flex gap-3"><button className={btn} onClick={()=>void save()}>{edit===null?"Add question":"Save changes"}</button>{edit!==null&&<button className={outline} onClick={()=>{setEdit(null);setDraft({question:"",answer:""});}}>Cancel</button>}</div><p role="status" className="text-sm text-[#5e7d70]">{msg}</p></div>
    {items.map(item=><div key={item.id} className={card+" p-5 flex justify-between items-start gap-4"}><div><h3 className="font-medium">{item.question}</h3><p className="mt-1 text-sm text-[#687f75] whitespace-pre-wrap">{item.answer}</p></div><div className="flex gap-2 shrink-0"><button className={outline+" !px-3 !py-2 !text-xs"} onClick={()=>{setEdit(item.id);setDraft({question:item.question,answer:item.answer});}}>Edit</button><button className="text-xs text-red-700" onClick={async()=>{if(!confirm("Delete FAQ?"))return;const x=await api.faqDelete({id:item.id});setMsg(x.ok?"Deleted":x.error||"Failed");if(x.ok)void refresh();}}>Delete</button></div></div>)}
  </div>;
}

type Lead = {
  id:number; name:string; business:string; email:string; website:string;
  handoffs:string[]; weeklyLoad:string; note:string; status:"new"|"contacted"|"closed";
  emailNotified:boolean; submittedAt:string;
};
function InboxPanel(){
  const [leads,setLeads]=useState<Lead[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [filter,setFilter]=useState<"all"|"new"|"contacted"|"closed">("all");
  async function refresh(){
    setLoading(true);
    const response=await api.leads();
    setLoading(false);
    if(!response.ok){setMessage(response.error||"Could not load inbox");return;}
    setMessage("");
    setLeads(response.json?.leads||[]);
  }
  useEffect(()=>{void refresh();},[]);
  async function update(id:number,status:Lead["status"]){
    const response=await api.leadStatus(id,status);
    if(response.ok) setLeads(items=>items.map(item=>item.id===id?{...item,status}:item));
    else setMessage(response.error||"Could not update status");
  }
  const visible=filter==="all"?leads:leads.filter(l=>l.status===filter);
  const newCount=leads.filter(l=>l.status==="new").length;
  return <div className="space-y-5">
    <section className={card+" p-5 sm:p-7"}>
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#739487]">Website inquiries</div>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Your lead inbox</h2>
          <p className="mt-2 text-sm text-[#688077]">Every successfully submitted postcard is saved here. Reply directly using the visitor’s email address.</p>
        </div>
        <button className={outline} onClick={()=>void refresh()}>Refresh inbox</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {(["all","new","contacted","closed"] as const).map(f=><button key={f} type="button" onClick={()=>setFilter(f)}
          className={`rounded-full border px-4 py-2 text-sm capitalize ${filter===f?"bg-[#15554c] border-[#15554c] text-white":"border-[#d9e4dc] text-[#54736a]"}`}>
          {f}{f==="new"?" ("+newCount+")":""}
        </button>)}
      </div>
      {message&&<p role="alert" className="mt-4 text-sm text-[#9c4b37]">{message}</p>}
    </section>
    {loading?<p className="text-sm text-[#637e73]">Loading inquiries…</p>:visible.length===0?
      <div className={card+" p-10 text-center"}><p className="font-serif text-2xl">No inquiries in this view.</p><p className="mt-2 text-sm text-[#72887d]">New postcard submissions will appear here.</p></div>:
      visible.map(lead=><article key={lead.id} className={card+" p-5 sm:p-7"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] tracking-wider uppercase text-[#7a9286]">Inquiry #{lead.id}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${lead.status==="new"?"bg-[#ecf5e8] text-[#336c4c]":lead.status==="contacted"?"bg-[#eaf0f5] text-[#3c6280]":"bg-[#eee] text-[#666]"}`}>{lead.status}</span>
              {lead.emailNotified&&<span className="text-xs text-[#6a8178]">Email alert sent</span>}
            </div>
            <h3 className="mt-2 font-serif text-2xl">{lead.name}</h3>
            {lead.business&&<p className="text-sm text-[#647f73]">{lead.business}</p>}
          </div>
          <time className="text-xs text-[#829489]">{new Date(lead.submittedAt).toLocaleString()}</time>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <p><span className="text-[#819389]">Email: </span><a href={`mailto:${lead.email}`} className="text-[#175e56] underline break-all">{lead.email}</a></p>
          {lead.website&&<p><span className="text-[#819389]">Website: </span><span className="break-all">{lead.website}</span></p>}
          {lead.weeklyLoad&&<p><span className="text-[#819389]">Weekly workload: </span>{lead.weeklyLoad}</p>}
        </div>
        {!!lead.handoffs?.length&&<div className="mt-4 flex flex-wrap gap-2">{lead.handoffs.map(item=><span key={item} className="rounded-full bg-[#edf3ef] px-3 py-1.5 text-xs text-[#3c6255]">{item}</span>)}</div>}
        {lead.note&&<p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f6f8f4] p-4 text-sm leading-relaxed text-[#3d5950]">{lead.note}</p>}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e5ebe4] pt-4">
          <a className={btn} href={`https://mail.google.com/mail/?authuser=${encodeURIComponent("merqato.digital@gmail.com")}&view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent("Re: Your Palawan Collective inquiry")}`} target="_blank" rel="noopener noreferrer">Reply in Gmail ↗</a>
          <select className={input+" !w-auto"} aria-label={`Status for ${lead.name}`} value={lead.status} onChange={e=>void update(lead.id,e.target.value as Lead["status"])}>
            <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
          </select>
        </div>
      </article>)}
  </div>;
}
export default function Admin(){
  const [auth,setAuth]=useState<"checking"|"in"|"out">("checking");
  const [tab,setTab]=useState<View>("Inbox");
  useEffect(()=>{api.check().then(r=>setAuth(r.ok?"in":"out"));},[]);
  if(auth==="checking")return <div className="min-h-screen bg-[#f6f8f4] grid place-items-center text-[#5c766b]">Opening Site Studio…</div>;
  if(auth==="out")return <Login onSuccess={()=>setAuth("in")}/>;
  return <div className="min-h-screen bg-[#f6f8f4] text-[#1b3d37] font-sans">
    <header className="sticky top-0 z-20 border-b border-[#e0e8df] bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-7 h-[76px] flex items-center justify-between gap-4">
        <div><p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#66867b]">Palawan Collective</p><h1 className="font-serif text-xl sm:text-2xl">Site Studio</h1></div>
        <div className="flex items-center gap-2 sm:gap-3"><a href="/" target="_blank" rel="noreferrer" className={outline+" !px-3"}>View site ↗</a><button className="text-xs sm:text-sm text-[#5c7970] hover:underline" onClick={async()=>{await api.logout();setAuth("out");}}>Sign out</button></div>
      </div>
    </header>
    <main className="max-w-7xl mx-auto px-4 sm:px-7 pb-14">
      <div className="pt-7 pb-6"><p className="text-sm text-[#789087]">Website management</p><h2 className="mt-1 font-serif text-3xl sm:text-4xl">Make it yours.</h2><p className="mt-2 text-sm text-[#73847b]">Manage inquiries, content, portfolio, images, and your brand identity.</p></div>
      <nav aria-label="Admin sections" className="flex gap-2 overflow-x-auto pb-5">
        {(["Inbox","Pages","Brand","Media","FAQ"] as View[]).map(t=><button key={t} className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition ${tab===t?"bg-[#164f49] text-white":"bg-white border border-[#e0e8e0] text-[#5f756b] hover:border-[#87b1a0]"}`} onClick={()=>setTab(t)}>{t}</button>)}
      </nav>
      {tab==="Inbox"&&<InboxPanel/>}{tab==="Pages"&&<PagePanel/>}{tab==="Brand"&&<BrandPanel/>}{tab==="Media"&&<MediaPanel/>}{tab==="FAQ"&&<FaqPanel/>}
    </main>
  </div>;
}

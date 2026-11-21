import type { Section } from "../content";

const defaults: Record<string, any[]> = {
  chores: [
    {t:"Answering the same five questions",h:4,skin:0,seed:3},
    {t:"Chasing unpaid invoices",h:3,skin:2,seed:11},
    {t:"Booking & rescheduling",h:3,skin:1,seed:7},
    {t:"Copying details from A to B",h:5,skin:3,seed:19},
    {t:"Sending reminder messages",h:2,skin:1,seed:23},
    {t:"Following up with new leads",h:3,skin:0,seed:31},
    {t:"Preparing the weekly report",h:2,skin:2,seed:41},
    {t:"Welcoming new customers",h:2,skin:3,seed:53},
    {t:"Reconciling the receipts",h:2,skin:1,seed:61}
  ],
  steps: [
    {n:"01",t:"Listen",d:"We sit with you — coffee optional, strongly encouraged — and learn how your days really go. What drains you, what you love, what keeps slipping.",aside:"you talk, we listen"},
    {n:"02",t:"Lighten",d:"Quietly, in the background, we set the repetitive work up to handle itself. Messages, bookings, payments, paperwork. All in your voice, your way.",aside:"we build quietly"},
    {n:"03",t:"Let go",d:"We hand it over, walk you through it, and stay close. As your business grows or changes, we adjust it with you.",aside:"you breathe out"}
  ],
  before: [
    ["6:40","Wake up to 37 unread messages"],["8:00","Say “yes, we're open Saturday” again"],["10:30","Retype orders into the spreadsheet"],
    ["13:00","Lunch at the desk. Cold."],["15:00","Chase three overdue invoices"],["19:30","Still sending reminder texts"],["22:45","“Just one more thing…”"]
  ],
  after: [
    ["7:30","Wake up. Messages already answered."],["9:00","Work on the thing you're great at"],["11:00","New bookings appeared. You did nothing."],
    ["13:00","Long lunch. Outside. Warm."],["15:00","Payments landed on their own"],["17:00","Close the laptop. Actually close it."],["18:30","Sunset swim"]
  ],
  testimonials: [
    {q:"I used to spend Sundays on admin. Now I spend them with my kids. That's the whole review.",w:"Maya",b:"Pilates studio"},
    {q:"Customers think I hired three people. I didn't. I just stopped doing everything by hand.",w:"Tomás",b:"Family bakery"},
    {q:"They explained everything like a friend would. I never once felt stupid. Rare.",w:"Priya",b:"Interior design"}
  ]
};
type Props = {section:Section; onChange:(patch:Record<string,any>)=>void};
const field="w-full border border-[#dae5dc] bg-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#b2d3c1]";
function EditableList({name,section,onChange}:{name:string}&Props){
  const items:any[]=Array.isArray(section.content?.[name])?section.content[name]:defaults[name];
  const isDay=name==="before"||name==="after";
  const keys=isDay?["0","1"]:name==="chores"?["t","h"]:name==="steps"?["n","t","aside","d"]:["w","b","q"];
  const labels:Record<string,string>={"0":"Time","1":"Activity",t:"Title",h:"Hours per week",n:"Step number",aside:"Small caption",d:"Description",w:"Client",b:"Business",q:"Testimonial"};
  const replace=(updated:any[])=>onChange({[name]:updated});
  const update=(index:number,key:string,value:string)=>replace(items.map((item,i)=>{
    if(i!==index)return item;
    if(isDay){const next=[...item];next[Number(key)]=value;return next;}
    return {...item,[key]:key==="h"?Math.max(0,Number(value)||0):value};
  }));
  const blank=isDay?["12:00","New activity"]:name==="chores"?{t:"New task",h:1,skin:0,seed:3}:name==="steps"?{n:String(items.length+1).padStart(2,"0"),t:"New step",aside:"",d:""}:{w:"",b:"",q:""};
  return <section className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold capitalize text-[#31594b]">{name==="testimonials"?"Client testimonials":name==="chores"?"Coconut tasks":name}</h3><span className="text-xs text-[#829488]">{items.length} items</span></div>
    {name==="testimonials"&&<p className="text-xs text-[#996b41]">Only publish genuine client testimonials with permission.</p>}
    {items.map((item,i)=><div key={i} className="rounded-xl border border-[#dfe9e0] bg-[#f8faf7] p-4 space-y-3">
      <div className="flex justify-between items-center gap-2"><span className="text-xs font-semibold text-[#638076]">Item {i+1}</span><div className="flex gap-3 text-xs">
        <button type="button" disabled={i===0} className="disabled:opacity-30" onClick={()=>{const a=[...items];[a[i-1],a[i]]=[a[i],a[i-1]];replace(a);}}>↑</button>
        <button type="button" disabled={i===items.length-1} className="disabled:opacity-30" onClick={()=>{const a=[...items];[a[i+1],a[i]]=[a[i],a[i+1]];replace(a);}}>↓</button>
        <button type="button" className="text-red-700" onClick={()=>replace(items.filter((_,j)=>j!==i))}>Delete</button></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{keys.map(key=><label key={key} className={key==="d"||key==="q"?"sm:col-span-2":""}>
        <span className="block text-xs font-medium text-[#5f796e] mb-1">{labels[key]}</span>
        {(key==="d"||key==="q")?<textarea className={field} rows={2} value={String(isDay?item[Number(key)]??"":item[key]??"")} onChange={e=>update(i,key,e.target.value)}/>:<input className={field} type={key==="h"?"number":"text"} value={String(isDay?item[Number(key)]??"":item[key]??"")} onChange={e=>update(i,key,e.target.value)}/>}
      </label>)}</div>
    </div>)}
    <button type="button" onClick={()=>replace([...items,blank])} className="w-full rounded-xl border border-dashed border-[#a4c5b3] bg-white py-3 text-sm font-medium text-[#21564a] hover:bg-[#f0f6f0]">＋ Add item</button>
  </section>;
}
export default function InteractiveEditor({section,onChange}:Props){
  const fields=section.key==="weight"?["chores"]:section.key==="how"?["steps"]:section.key==="tuesday"?["before","after"]:section.key==="stories"?["testimonials"]:[];
  if(!fields.length)return null;
  return <div className="rounded-2xl border border-[#dbe8dc] p-4 sm:p-5 space-y-7">
    <h3 className="text-base font-serif text-[#21483f]">Interactive content</h3>
    {fields.map(name=><EditableList key={name} name={name} section={section} onChange={onChange}/>)}
  </div>;
}

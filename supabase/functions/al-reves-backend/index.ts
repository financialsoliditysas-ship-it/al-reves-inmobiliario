import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const expectedTokenHash = "007500a47f5e719b754a646ce7ae40c05a69ea910daf43dbec23dbb7853d0337";
const allowedEvents = new Set(["views","whatsapp","leads","searches","property_views","contact_clicks","requests_opened","shares","owner_publication_requests"]);
const allowedMimeTypes = new Set(["image/jpeg","image/png","image/webp","video/mp4","video/quicktime"]);
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""); }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const supplied = req.headers.get("x-backend-token") || "";
  if (!supplied || await sha256(supplied) !== expectedTokenHash) return json({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return json({ error: "Supabase server credentials unavailable" }, 500);
  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await req.json(); const action = body?.action;
    if (action === "upsert_property") {
      const p = body.property || {};
      if (!p.id || !p.reference || !p.title || !p.type || !p.operation || p.price === undefined || !p.location || !p.municipality || !p.description) return json({ error: "Missing required property fields" }, 400);
      const row = { id:p.id,reference:p.reference,title:p.title,type:p.type,operation:p.operation,status:p.status||"Disponible",price:Number(p.price),rent:p.rent?Number(p.rent):null,admin_fee:p.adminFee?Number(p.adminFee):null,other_charges:p.otherCharges?Number(p.otherCharges):null,location:p.location,municipality:p.municipality,neighborhood:p.neighborhood||null,map_url:p.mapUrl||null,description:p.description,features:Array.isArray(p.features)?p.features:[],published:p.published!==false,updated_at:new Date().toISOString() };
      const { data,error }=await supabase.from("properties").upsert(row,{onConflict:"id"}).select().single(); if(error) throw error;
      if(Array.isArray(p.media)){ const {error:de}=await supabase.from("property_media").delete().eq("property_id",p.id); if(de) throw de; const media=p.media.filter((m:any)=>m?.url).map((m:any,i:number)=>({property_id:p.id,kind:m.kind==="video"?"video":"image",url:m.url,storage_path:m.storagePath||null,mime_type:m.mimeType||null,byte_size:m.byteSize||null,alt_text:m.altText||null,position:i})); if(media.length){const {error:me}=await supabase.from("property_media").insert(media);if(me)throw me;} }
      return json({property:data});
    }
    if(action==="create_upload_token"){ const path=String(body.path||"").replace(/[^a-zA-Z0-9._/-]/g,"-"); const contentType=String(body.contentType||""); if(!path||!allowedMimeTypes.has(contentType))return json({error:"Unsupported file"},400); const {data,error}=await supabase.storage.from("property-media").createSignedUploadUrl(path);if(error)throw error;const {data:pub}=supabase.storage.from("property-media").getPublicUrl(path);return json({path,token:data.token,signedUrl:data.signedUrl,publicUrl:pub.publicUrl}); }
    if(action==="metric"){if(!allowedEvents.has(body.event))return json({error:"Invalid metric event"},400);const {error}=await supabase.from("analytics_events").insert({event_type:body.event,property_id:body.propertyId||null,session_hash:body.sessionHash||null,metadata:body.metadata||{}});if(error)throw error;return json({ok:true,stored:true});}
    if(action==="metrics_summary"){const summary:Record<string,number>={};for(const event of allowedEvents){const {count,error}=await supabase.from("analytics_events").select("*",{count:"exact",head:true}).eq("event_type",event);if(error)throw error;summary[event]=count||0;}return json({metrics:summary});}
    if(action==="create_lead"){const lead=body.lead||{};const {data,error}=await supabase.from("leads").insert({property_id:lead.propertyId||null,intent:lead.intent,name:lead.name||null,phone:lead.phone||null,message:lead.message||null,consent:Boolean(lead.consent),source_path:lead.sourcePath||null}).select("id,created_at").single();if(error)throw error;return json({lead:data},201);}
    return json({error:"Unknown action"},400);
  } catch(error){return json({error:error instanceof Error?error.message:"Unexpected error"},500);}
});

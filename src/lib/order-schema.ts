import { z } from "zod";
import { units, services } from "./catalog";
import { jakartaDate } from "./utils";
export const previewSchema = z.object({
 name: z.string().trim().min(2,"Isi nama agent, minimal 2 karakter.").max(120),
 code: z.string().trim().min(1,"Isi kode PA.").max(30).regex(/^[a-zA-Z0-9-]+$/,"Gunakan huruf, angka, atau tanda hubung."),
 unit: z.string().refine(v => units.some(u => u === v),"Pilih unit dari daftar."),
 date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal pengerjaan.").refine(v => { const d = new Date(v+"T00:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v; },"Tanggal tidak valid.").refine(v => v >= jakartaDate(),"Tanggal tidak boleh di masa lampau."),
 address: z.string().trim().min(10,"Lengkapi alamat, blok, dan nomor rumah.").max(1000),
 maps: z.string().trim().max(2000).refine(v=>{ if(!v) return true; try { const u=new URL(v); return u.protocol === "https:" && ["maps.app.goo.gl","maps.google.com","www.google.com","google.com","goo.gl"].includes(u.hostname); } catch {return false;} },"Gunakan tautan HTTPS Google Maps yang valid."),
 notes: z.string().max(1000),
 tasks: z.array(z.string().refine(v=>services.some(s=>s.id===v))).min(1,"Pilih setidaknya satu layanan."),
 other: z.string().trim().max(1000),
 banners: z.union([z.number(),z.nan()]),
 height: z.union([z.number(),z.nan()]),
 owner: z.enum(["YA","TIDAK"]),
 consent: z.boolean().refine(Boolean,"Persetujuan diperlukan untuk melanjutkan.")
}).superRefine((v,ctx)=>{
 if(v.tasks.includes("banner")) {
  if(!Number.isSafeInteger(v.banners)||v.banners<1||v.banners>100)ctx.addIssue({code:"custom",path:["banners"],message:"Jumlah banner harus bilangan bulat 1–100."});
  if(!Number.isFinite(v.height)||v.height<=0||v.height>4)ctx.addIssue({code:"custom",path:["height"],message:"Tinggi pemasangan harus lebih dari 0 dan maksimal 4 meter."});
 }
if(v.tasks.includes("other")&&!v.other)ctx.addIssue({code:"custom",path:["other"],message:"Jelaskan tugas lainnya."});});
export type PreviewValues = z.infer<typeof previewSchema>;
export const defaults: PreviewValues = {name:"",code:"",unit:"",date:"",address:"",maps:"",notes:"",tasks:[],other:"",banners:1,height:1,owner:"TIDAK",consent:false};
export function bannerEstimate(tasks: readonly string[], count: number) { if (!Number.isSafeInteger(count)||count<1||count>100) throw new Error("Jumlah banner tidak valid"); return tasks.includes("banner") ? count*5000 : 0; }

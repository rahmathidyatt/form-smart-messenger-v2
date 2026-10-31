import { z } from "zod";
import { units, services } from "./catalog";
import { jakartaDate } from "./utils";
const baseOrderSchema = z.object({
 email:z.string().trim().email("Isi alamat email yang valid.").max(254).transform(v=>v.toLowerCase()),
 name:z.string().trim().min(1,"Isi nama dan kode agent.").max(180),
 code:z.string().trim().regex(/^[a-zA-Z0-9-]{0,30}$/, "Isi kode PA, gunakan huruf/angka/tanda hubung."),
 unit:z.string().refine(v=>units.some(u=>u===v),"Pilih unit Brighton."),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal pengerjaan.").refine(v=>{const d=new Date(v+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;},"Tanggal tidak valid."),
 address:z.string().trim().min(1,"Isi alamat lengkap.").max(1500),
 maps:z.string().trim().max(1000).transform(v=>/^[-–—]+$/.test(v)?"":v).refine(v=>{if(!v)return true;try{const u=new URL(v);return u.protocol==="https:"&&["maps.app.goo.gl","maps.google.com","google.com","www.google.com","goo.gl"].includes(u.hostname);}catch{return false;}},"Kosongkan kolom ini atau masukkan tautan Google Maps yang valid."),
 task:z.string().refine(v=>services.some(s=>s.id===v),"Pilih tugas messenger."),
 other:z.string().trim().max(1000),
 owner:z.string().refine(v=>["YA","TIDAK"].includes(v),"Pilih konfirmasi owner."),
 consent:z.boolean().refine(Boolean,"Persetujuan diperlukan.")
}).strict().superRefine((v,c)=>{if(v.task==="other"&&!v.other)c.addIssue({code:"custom",path:["other"],message:"Jelaskan tugas lainnya."});});
export const orderSchema=baseOrderSchema.superRefine((v,c)=>{if(v.date<jakartaDate())c.addIssue({code:"custom",path:["date"],message:"Tanggal tidak boleh di masa lalu."});});
export type OrderInput = z.input<typeof orderSchema>;
export const receiptSchema=z.object({id:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const envelopeSchema=receiptSchema.extend({order:baseOrderSchema,challenge:z.string().max(2048),website:z.string().max(0)}).strict();
export type Receipt=z.infer<typeof receiptSchema>;
export type SyncResult={id:string;state:string;responseId:string|null;updatedAt:string;notifications?:Record<string,{state:string}>};
export const statusLabels:Record<string,string>={queued:"Pengajuan diterima dan sedang diproses",retry_wait:"Pengajuan diterima dan sedang diproses",submitting:"Pengajuan sedang diproses",synced:"Pengajuan berhasil dikirim",needs_review:"Pengajuan sedang diperiksa staf. Tidak perlu mengirim ulang.",failed:"Pengajuan belum dapat diselesaikan. Silakan hubungi staf kantor."};

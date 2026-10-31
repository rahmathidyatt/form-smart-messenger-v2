import Link from "next/link";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
export function EmptyState({eyebrow,title,description}:{eyebrow:string;title:string;description:string}){return <section className="container section"><p className="eyebrow">{eyebrow}</p><div className="empty-panel"><span className="empty-icon"><LockKeyhole size={28}/></span><h1>{title}</h1><p>{description}</p><p className="muted">Autentikasi dan koneksi data tersedia setelah Checkpoint B. Tidak ada data pesanan yang ditampilkan pada pratinjau ini.</p><Button asChild variant="outline"><Link href="/"><ArrowLeft size={16}/> Kembali ke beranda</Link></Button></div></section>}

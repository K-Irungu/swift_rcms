import Link from "next/link";

const LOGO_CLIP = "polygon(0 0,100% 0,100% 100%,27% 100%,0 73%)";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-4 font-medium">
      <div
        className="flex text-xl font-extrabold items-center justify-center border border-[#B0BDD0] text-primary-foreground w-12 h-12"
        style={{ clipPath: LOGO_CLIP }}
      >
        SR
      </div>
      <div className="flex gap-1.5">
        <span className="font-extrabold text-white text-xl">swift</span>
        <span className="font-extrabold text-[#B0BDD0] text-xl">rcms</span>
      </div>
    </Link>
  );
}

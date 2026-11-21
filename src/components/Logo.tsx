import Turtle from "./Turtle";

export default function Logo({ size = "md", swim = false }: { size?: "sm" | "md" | "lg"; swim?: boolean }) {
  if (size === "sm")
    return (
      <div className="flex items-center gap-2.5">
        <Turtle className="w-9 h-9" swim={swim} />
        <div className="leading-none">
          <div className="font-brand font-bold tracking-[0.16em] text-[13px]">PALAWAN</div>
          <div className="font-brand text-[7px] tracking-[0.58em] mt-1">COLLECTIVE</div>
        </div>
      </div>
    );
  const big = size === "lg";
  return (
    <div className="relative inline-flex flex-col items-center">
      <Turtle className={big ? "w-28 sm:w-40 md:w-52 -mb-5 sm:-mb-8 md:-mb-10 -ml-3 sm:-ml-6" : "w-32 -mb-6 -ml-4"} swim={swim} />
      <div className={`font-brand font-bold leading-none ${big ? "text-[clamp(1.65rem,8vw,3rem)] md:text-6xl tracking-[0.05em] sm:tracking-[0.1em]" : "text-4xl tracking-[0.1em]"}`}>
        PALAWAN
      </div>
      <div className={`font-brand leading-none ${big ? "text-[10px] sm:text-base md:text-lg tracking-[0.45em] sm:tracking-[0.7em] mt-2 sm:mt-3 pl-[0.45em] sm:pl-[0.7em]" : "text-sm tracking-[0.7em] mt-2 pl-[0.7em]"}`}>
        COLLECTIVE
      </div>
    </div>
  );
}

// lucide-react ships its own types via `typings: "dist/lucide-react.d.ts"`,
// but that file is missing on some installs. Fallback ambient declaration
// with just enough surface area for the icons we actually use.
declare module "lucide-react" {
  import type { SVGProps, ForwardRefExoticComponent, RefAttributes } from "react";
  export interface LucideProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
    color?: string;
    strokeWidth?: number | string;
  }
  type Icon = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;
  export const FileText: Icon;
  export const LayoutDashboard: Icon;
  export const Plus: Icon;
  export const Receipt: Icon;
  export const Settings: Icon;
  // Fallback for any other icon we reach for later.
  const defaultExport: { [k: string]: Icon };
  export default defaultExport;
}

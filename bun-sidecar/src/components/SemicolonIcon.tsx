import { forwardRef } from "react";
import { LucideProps } from "lucide-react";

/**
 * Custom Semicolon Icon following Lucide design guidelines
 * - 24x24 viewBox
 * - 2px stroke width
 * - Rounded line caps and joins
 * - No fill, stroke only
 */
export const SemicolonIcon = forwardRef<SVGSVGElement, LucideProps>(
    ({ color = "currentColor", size = 24, strokeWidth = 2, className, ...props }, ref) => {
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                {...props}
            >
                {/* Top dot of semicolon */}
                <circle cx="12" cy="8" r="1.5" fill={color} stroke="none" />
                {/* Bottom comma part of semicolon */}
                <path d="M 12 14 Q 12 16, 10 18" fill="none" />
            </svg>
        );
    }
);

SemicolonIcon.displayName = "SemicolonIcon";
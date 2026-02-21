import Link from "next/link";
import React from "react";

interface ListGameProps {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    colorTo: string;
}

const ListGame: React.FC<ListGameProps> = ({ href, title, description, icon, color, colorTo }) => {
    return (
        <Link
            href={href}
            className="group relative block p-1"
            style={{
                '--card-color': `var(--color-${color})`,
                '--card-color-to': `var(--color-${colorTo})`,
            } as React.CSSProperties}
        >
            <div className="relative flex items-center gap-8 bg-linear-to-l from-(--card-color)/80 via-black/80 to-black/80 
                hover:from-(--card-color) hover:via-(--card-color-to) hover:to-(--card-color-to)
                border border-gray-800 rounded-2xl p-8 hover:bg-black/80 transition-colors duration-300 overflow-hidden">

                {/* Content */}
                <div className="flex-1 text-left">
                    <h2 className="text-3xl font-bold mb-2 transition-colors text-(--card-color) group-hover:text-white">
                        {title}
                    </h2>
                    <p className="text-gray-400 group-hover:text-white">
                        {description}
                    </p>
                </div>

                {/* Icon Container */}
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center border transition-transform duration-300 group-hover:bg-white"
                >
                    {React.isValidElement(icon) ?
                        React.cloneElement(icon as React.ReactElement<any>, {
                            className: "h-8 w-8 text-white group-hover:text-(--card-color)"
                        }) : icon}
                </div>
            </div>
        </Link>
    );
};

export default ListGame;

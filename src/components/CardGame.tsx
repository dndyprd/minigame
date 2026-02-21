"use client";

import Link from "next/link";
import React from "react";
import Squares from "./BackgroundGrid";

interface GameStartMenuProps {
    title: string;
    description?: React.ReactNode;
    onStart?: () => void;
    onFileUpload?: (file: File) => void;
    startLabel?: string;
    uploadLabel?: string;
    mainAction?: React.ReactNode;
    footer?: React.ReactNode;
    isLoading: boolean;
    color: string;
    colorTo: string;
}

const GameStartMenu: React.FC<GameStartMenuProps> = ({
    title,
    description,
    onStart,
    onFileUpload,
    startLabel = "START MISSION",
    uploadLabel = "UPLOAD MUSIC",
    mainAction,
    footer,
    isLoading,
    color,
    colorTo,
}) => {
    const buttonClass = "group relative inline-flex items-center justify-center px-12 py-6 overflow-hidden font-bold text-white rounded-xl bg-linear-to-r from-(--menu-color) to-(--menu-color-to) transition-all duration-300 hover:scale-101 w-full cursor-pointer";

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black overflow-hidden text-white">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0">
                <Squares
                    speed={0.3}
                    squareSize={75}
                    direction="diagonal"
                    borderColor="#111325"
                />
            </div>
            <div
                className="relative w-full max-w-2xl px-4"
                style={{
                    '--menu-color': `var(--color-${color})`,
                    '--menu-color-to': `var(--color-${colorTo})`,
                } as React.CSSProperties}
            >
                {isLoading ? (
                    // LOADING
                    <div className="flex flex-col items-center gap-8 py-20">
                        <div className="relative w-25 h-25">
                            <div className="absolute inset-0 border-t-6 border-white rounded-full animate-spin"></div>
                            <div className="absolute inset-0 border-6 border-white/10 rounded-full"></div>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-white text-2xl font-semibold animate-pulse uppercase tracking-wider">
                                INITIALIZING SYSTEMS
                            </p>
                        </div>
                    </div>
                ) : (
                    // MENU
                    <div className="group relative">
                        <div className="absolute -inset-1 bg-linear-to-r from-(--menu-color) to-(--menu-color-to) rounded-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>

                        <div className="relative bg-black/40 backdrop-blur-md border border-gray-800 rounded-2xl p-12 text-center overflow-hidden">

                            <h1 className="text-6xl md:text-7xl font-bold mb-4 transition-colors text-white tracking-tighter uppercase">
                                {title}
                            </h1>

                            <div className="space-y-4 mb-12 text-lg text-gray-300 font-light flex flex-col items-center">
                                {description}
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                {mainAction ? mainAction : (
                                    <>
                                        {onFileUpload && (
                                            <label className={buttonClass}>
                                                <input
                                                    type="file"
                                                    accept=".mp3,.m4a,.opus,.wav,.ogg,audio/mpeg,audio/mp4,audio/opus,audio/wav,audio/ogg"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) onFileUpload(file);
                                                    }}
                                                />
                                                <span className="relative text-2xl tracking-[0.2em]">
                                                    {uploadLabel}
                                                </span>
                                            </label>
                                        )}
                                        {onStart && (
                                            <button onClick={onStart} className={buttonClass}>
                                                <span className="relative text-2xl tracking-[0.2em]">
                                                    {startLabel}
                                                </span>
                                            </button>
                                        )}
                                    </>
                                )}
                                <Link href="/" className={buttonClass}>
                                    <span className="relative text-2xl tracking-[0.2em]">
                                        BACK TO HOME
                                    </span>
                                </Link>
                                {footer}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameStartMenu;

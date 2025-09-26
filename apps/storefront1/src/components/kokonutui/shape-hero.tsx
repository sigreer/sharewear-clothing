"use client";

/**
 * @author: @dorian_baffier
 * @description: Shape Hero
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from "motion/react";
import { Pacifico } from "next/font/google";
import { cn } from "@/lib/utils";

const pacifico = Pacifico({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-pacifico",
});

function ElegantShape({
    className,
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "from-white/[0.08]",
    borderRadius = 16,
    clipPath,
    transform,
}: {
    className?: string;
    delay?: number;
    width?: number;
    height?: number;
    rotate?: number;
    gradient?: string;
    borderRadius?: number;
    clipPath?: string;
    transform?: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: -150,
                rotate: rotate - 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
                rotate: rotate,
            }}
            transition={{
                duration: 2.4,
                delay,
                ease: [0.23, 0.86, 0.39, 0.96],
                opacity: { duration: 1.2 },
            }}
            className={cn("absolute", className)}
        >
            <motion.div
                animate={{
                    y: [0, 15, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                }}
                style={{
                    width,
                    height,
                    transform,
                }}
                className="relative"
            >
                <div
                    style={{
                        borderRadius: clipPath ? 0 : borderRadius,
                        clipPath,
                    }}
                    className={cn(
                        "absolute inset-0",
                        "bg-gradient-to-br to-transparent",
                        gradient,
                        "backdrop-blur-[3px]",
                        "ring-1 ring-white/30 dark:ring-white/20",
                        "shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4)] dark:shadow-[0_8px_32px_-4px_rgba(255,255,255,0.15)]",
                        "after:absolute after:inset-0",
                        "after:bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.6),transparent_60%)] dark:after:bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_60%)]",
                        !clipPath && "after:rounded-[inherit]"
                    )}
                />
            </motion.div>
        </motion.div>
    );
}

export default function ShapeHero({
    title1 = "Elevate Your",
    title2 = "Digital Vision",
}: {
    title1?: string;
    title2?: string;
}) {
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 1,
                delay: 0.5 + i * 0.2,
                ease: [0.25, 0.4, 0.25, 1],
            },
        }),
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] dark:from-indigo-500/[0.05] dark:via-transparent dark:to-rose-500/[0.05] blur-3xl" />

            <div className="absolute inset-0 overflow-hidden">
                {/* Tall rectangle - top left */}
                <ElegantShape
                    delay={0.3}
                    width={300}
                    height={500}
                    rotate={-8}
                    borderRadius={24}
                    gradient="from-indigo-500/40 via-indigo-400/30 to-indigo-300/20 dark:from-indigo-400/50 dark:via-indigo-300/40 dark:to-indigo-200/30"
                    className="left-[-15%] top-[-10%]"
                />

                {/* Wide rectangle - bottom right */}
                <ElegantShape
                    delay={0.5}
                    width={600}
                    height={200}
                    rotate={15}
                    borderRadius={20}
                    gradient="from-rose-500/40 via-rose-400/30 to-rose-300/20 dark:from-rose-400/50 dark:via-rose-300/40 dark:to-rose-200/30"
                    className="right-[-20%] bottom-[-5%]"
                />

                {/* Square - middle left */}
                <ElegantShape
                    delay={0.4}
                    width={300}
                    height={300}
                    rotate={24}
                    borderRadius={32}
                    gradient="from-violet-500/40 via-violet-400/30 to-violet-300/20 dark:from-violet-400/50 dark:via-violet-300/40 dark:to-violet-200/30"
                    className="left-[-5%] top-[40%]"
                />

                {/* Small rectangle - top right */}
                <ElegantShape
                    delay={0.6}
                    width={250}
                    height={100}
                    rotate={-20}
                    borderRadius={12}
                    gradient="from-amber-500/40 via-amber-400/30 to-amber-300/20 dark:from-amber-400/50 dark:via-amber-300/40 dark:to-amber-200/30"
                    className="right-[10%] top-[5%]"
                />

                {/* New shapes */}
                {/* Medium rectangle - center right */}
                <ElegantShape
                    delay={0.7}
                    width={400}
                    height={150}
                    rotate={35}
                    borderRadius={16}
                    gradient="from-emerald-500/40 via-emerald-400/30 to-emerald-300/20 dark:from-emerald-400/50 dark:via-emerald-300/40 dark:to-emerald-200/30"
                    className="right-[-10%] top-[45%]"
                />

                {/* Small square - bottom left */}
                <ElegantShape
                    delay={0.2}
                    width={200}
                    height={200}
                    rotate={-25}
                    borderRadius={28}
                    gradient="from-blue-500/40 via-blue-400/30 to-blue-300/20 dark:from-blue-400/50 dark:via-blue-300/40 dark:to-blue-200/30"
                    className="left-[20%] bottom-[10%]"
                />

                {/* Tiny rectangle - top center */}
                <ElegantShape
                    delay={0.8}
                    width={150}
                    height={80}
                    rotate={45}
                    borderRadius={10}
                    gradient="from-purple-500/40 via-purple-400/30 to-purple-300/20 dark:from-purple-400/50 dark:via-purple-300/40 dark:to-purple-200/30"
                    className="left-[40%] top-[15%]"
                />

                {/* Wide rectangle - middle */}
                <ElegantShape
                    delay={0.9}
                    width={450}
                    height={120}
                    rotate={-12}
                    borderRadius={18}
                    gradient="from-teal-500/40 via-teal-400/30 to-teal-300/20 dark:from-teal-400/50 dark:via-teal-300/40 dark:to-teal-200/30"
                    className="left-[25%] top-[60%]"
                />

                {/* New Swirl Shape - top center */}
                <ElegantShape
                    delay={0.4}
                    width={180}
                    height={180}
                    rotate={30}
                    borderRadius={90}
                    gradient="from-cyan-500/40 via-cyan-400/30 to-cyan-300/20 dark:from-cyan-400/50 dark:via-cyan-300/40 dark:to-cyan-200/30"
                    transform="skew(-15deg, 5deg)"
                    className="left-[60%] top-[8%]"
                />

                {/* New Star Shape - middle right */}
                <ElegantShape
                    delay={0.6}
                    width={160}
                    height={160}
                    rotate={45}
                    clipPath="polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
                    gradient="from-orange-500/40 via-orange-400/30 to-orange-300/20 dark:from-orange-400/50 dark:via-orange-300/40 dark:to-orange-200/30"
                    className="right-[5%] top-[65%]"
                />

                {/* New Triangle Shape - bottom center */}
                <ElegantShape
                    delay={0.8}
                    width={200}
                    height={200}
                    rotate={-15}
                    clipPath="polygon(50% 0%, 0% 100%, 100% 100%)"
                    gradient="from-pink-500/40 via-pink-400/30 to-pink-300/20 dark:from-pink-400/50 dark:via-pink-300/40 dark:to-pink-200/30"
                    className="left-[10%] bottom-[25%]"
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        custom={1}
                        variants={fadeUpVariants as any}
                        initial="hidden"
                        animate="visible"
                    >
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-black to-black/80 dark:from-white dark:to-white/80">
                                {title1}
                            </span>
                            <br />
                            <span
                                className={cn(
                                    "bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-black/90 to-rose-300 dark:from-indigo-300 dark:via-white/90 dark:to-rose-300",
                                    pacifico.className
                                )}
                            >
                                {title2}
                            </span>
                        </h1>
                    </motion.div>
                    <motion.div
                        custom={2}
                        variants={fadeUpVariants as any}
                        initial="hidden"
                        animate="visible"
                    >
                        <p className="text-base sm:text-lg md:text-xl text-black/40 dark:text-white/40 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4">
                            UI Components built with Tailwind CSS.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-white/40 dark:from-[#030303]/60 dark:via-transparent dark:to-[#030303]/40 pointer-events-none" />
        </div>
    );
}

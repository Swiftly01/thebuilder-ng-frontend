"use client";
import { usePublicData } from "@/context/PublicDataContext";

import { publicationDate } from "@/lib/dates";
import { Edition } from "@/lib/types";
import Kicker from "../ui/Kicker";
import Link from "next/link";
import { ContentImage } from "../ui/ContentImage";

interface HomeHeroProps {
  edition: Edition;
  loading?: boolean;
}

export default function HomeHero({ edition, loading }: HomeHeroProps) {
  const content = usePublicData()?.home;
  const lead = content?.lead;
  const secondary = content?.secondary || [];
  if (loading)
    return (
      <div className="h-[500px] bg-[var(--surface-skeleton)] animate-pulse max-w-container mx-auto mt-8" />
    );

  if (!lead) return null;

  return (
    <section
      aria-label="Lead story"
      data-edition={edition}
      className="home-hero mx-auto max-w-container px-4 pb-10 md:pb-[72px] md:pt-8 md:px-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-x-8 gap-y-6">
        {/* Lead Story */}
        <Link
          href={lead.slug ? "/stories/" + lead.slug : "/stories"}
          className="home-cover group relative flex min-w-0 flex-col md:overflow-hidden md:rounded-lg md:bg-[var(--surface-inverse)] md:text-[var(--text-on-inverse)]"
        >
          <div className="home-cover-media relative mx-0 aspect-[16/10] bg-[var(--surface-inverse)] md:absolute md:inset-0 md:aspect-auto">
            <ContentImage
              src={content?.lead?.imageUrl || content?.lead?.image}
              alt={content?.lead?.imageAlt || lead.title}
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-t from-[var(--surface-inverse-deep)] via-[color:color-mix(in_srgb,var(--surface-inverse-deep)_55%,transparent)] to-transparent md:block" />
          </div>
          <div className="home-cover-copy relative z-10 pt-4 md:mt-auto md:w-full md:p-[clamp(20px,3.4vw,40px)] flex flex-col justify-end">
            <Kicker inverse className="mb-[14px]">
              {lead.kicker}
            </Kicker>
            <h1 className="mb-[14px] font-display text-[30px] font-extrabold leading-[36px] tracking-[-.02em] md:text-[clamp(30px,3.6vw,52px)] md:leading-[1.06]">
              {lead.title}
            </h1>
            <p className="home-cover-summary text-[15px] leading-[23px] md:text-[17px] md:leading-[26px] md:text-[color:color-mix(in_srgb,var(--text-on-inverse)_90%,transparent)] mb-[14px] max-w-[600px] line-clamp-2">
              {lead.summary}
            </p>
            <div className="home-cover-meta flex flex-wrap items-center gap-[6px] text-[13px] leading-[18px] font-ui md:text-[var(--text-meta-on-inverse)]">
              <span className="font-medium text-[var(--text-on-inverse)]">
                {lead.author}
              </span>
              <span>·</span>
              <span>{publicationDate(lead.date)}</span>
              <span>·</span>
              <span>{lead.readTime}</span>
            </div>
          </div>
        </Link>

        {/* Secondary Stories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 content-start">
          {secondary.map((story, i) => (
            <Link
              href={
                content?.secondary[i]?.slug
                  ? "/stories/" + content.secondary[i]!.slug
                  : "/stories"
              }
              key={story.title}
              className="group grid grid-cols-[112px_minmax(0,1fr)] items-start gap-[20px] border-t border-[var(--border)] pt-[20px] md:grid-cols-[140px_minmax(0,1fr)] lg:grid-cols-[168px_minmax(0,1fr)]"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[var(--surface-tint)] md:aspect-[4/3]">
                <ContentImage
                  src={
                    content?.secondary[i]?.imageUrl ||
                    content?.secondary[i]?.image
                  }
                  alt={content?.secondary[i]?.imageAlt || story.title}
                  sizes="168px"
                />
              </div>
              <div className="flex flex-col justify-start min-w-0">
                <Kicker className="mb-[8px] text-[11px]">{story.kicker}</Kicker>
                <h2 className="mb-[8px] font-display text-[17px] font-bold leading-[1.3] tracking-tight text-[var(--text-heading)] md:text-[20px]">
                  <span className="bg-[linear-gradient(var(--accent),var(--accent))] bg-no-repeat bg-[position:0_100%] bg-[length:0%_2px] group-hover:bg-[length:100%_2px] transition-[background-size] duration-250 pb-[2px]">
                    {story.title}
                  </span>
                </h2>
                <div className="text-[13px] leading-[18px] text-[var(--text-meta)]">
                  {publicationDate(story.date)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

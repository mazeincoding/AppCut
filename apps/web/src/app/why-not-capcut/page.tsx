"use client";

import { Header } from "@/components/header";
import { useState } from "react";

export default function WhyNotCapcut() {
  const [isSpicy, setIsSpicy] = useState(false);

  return (
    <div className="min-h-screen bg-background px-5">
      <Header />

      <main className="relative mt-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="mx-auto flex items-center justify-center">
          <span className="mr-2 text-sm">Clean Roast</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isSpicy}
              onChange={() => setIsSpicy(!isSpicy)}
            />
            <div className="w-11 h-6 border border-white rounded-full peer-checked:bg-white transition-all duration-300" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-black border border-white rounded-full transform transition-all duration-300 peer-checked:translate-x-full" />
          </label>
          <span className="ml-2 text-sm">Spicy Roast</span>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          {isSpicy ? (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                  Fuck CapCut
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Roasting time, so get ready motherfucker.
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    Seriously, what the fuck else do you want?
                  </h2>
                  <p className="text-lg mb-6">
                    You probably use CapCut and think your video editing is
                    special. You think your fucking TikTok with 47 transitions
                    and 12 different fonts is going to get you some viral fame.
                    You think loading up every goddamn effect in their library
                    makes your content better. Wrong, motherfucker. Let me
                    describe what CapCut actually gives you:
                  </p>
                  <ul className="text-lg space-y-2 mb-6 list-disc list-inside">
                    <li>A paywall every time you breathe</li>
                    <li>Terms of service that steal your shit</li>
                    <li>
                      More "Get Pro" dialogs than a Windows 95 error message
                    </li>
                    <li>
                      Features that disappear behind paywalls while you're
                      fucking using them
                    </li>
                    <li>Bugs disguised as "premium features"</li>
                  </ul>
                  <p className="text-lg mb-6">
                    <strong>Well guess what, motherfucker:</strong>
                  </p>
                  <p className="text-lg mb-6">
                    You. Are. Getting. Scammed. Look at this shit. It's a
                    fucking video editor. Why the fuck do you need to pay
                    $20/month just to remove a goddamn watermark? You spent
                    hours editing your video and they slap their logo on it like
                    they fucking made it.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    The "Get Pro" dialog is everywhere
                  </h2>
                  <p className="text-lg mb-6">
                    This motherfucking dialog pops up more than ads on a pirated
                    movie site. Want to add a transition? Get Pro. Want to
                    export without their watermark? Get Pro. Want to use more
                    than 2 fonts? Get fucking Pro, peasant.
                  </p>
                  <p className="text-lg mb-6">
                    Did you seriously think you could edit a video without
                    seeing this dialog 47 times? You click one button and BAM -
                    there it is again, asking for your credit card like a
                    desperate ex asking for money.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    Everything costs money now
                  </h2>
                  <p className="text-lg mb-6">
                    You dumbass. You thought CapCut was free, but no. Free means
                    they let you open the app. Everything else costs money.
                    Basic shake effect? That'll be $20/month. A decent
                    transition that isn't "fade"? Pay up, motherfucker.
                  </p>
                  <p className="text-lg mb-6">
                    Here's my favorite piece of bullshit: You import an MP3 file
                    - you know, AUDIO - and try to export. "Sorry, can't export
                    because you're using our premium extract audio feature!"
                  </p>
                  <p className="text-lg mb-6">
                    <strong>
                      My MP3 was already fucking audio, you absolute morons.
                    </strong>
                  </p>
                  <p className="text-lg mb-6">
                    But wait, there's more! If you drag that same MP3 to their
                    media panel first, then to the timeline, it magically works.
                    This isn't a bug, it's a fucking scam disguised as software
                    engineering.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    Their Terms of Service are insane
                  </h2>
                  <p className="text-lg mb-6">
                    Look at this shit. You upload your content and they
                    basically say "thanks for the free content, we own it now,
                    but if Disney sues anyone, that's your problem."
                  </p>
                  <p className="text-lg mb-6">
                    <strong>CapCut's Terms of Service:</strong> We get full
                    rights to use, modify, distribute, and monetize everything
                    you upload - permanently and without paying you shit. But
                    you're still responsible if anything goes wrong.
                  </p>
                  <p className="text-lg mb-6">
                    Translation: "We'll make money off your viral video, you
                    handle the lawsuits." Brilliant legal strategy, you fucks.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    The editor is actually good
                  </h2>
                  <p className="text-lg mb-6">
                    Here's the thing that makes me want to punch my monitor: the
                    actual video editor is fucking good. It's intuitive,
                    powerful, and anyone can figure it out. When it's not
                    begging for money every 30 seconds, it actually works well.
                  </p>
                  <p className="text-lg mb-6">
                    Which makes everything else so much worse. They built
                    something people want to use, then turned it into a digital
                    slot machine. Every click might trigger a payment request.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    This is a video editor. Look at it. You've never seen one
                    before.
                  </h2>
                  <p className="text-lg mb-6">
                    Like the person who's never used software that doesn't
                    constantly beg for money, you have no fucking idea what a
                    video editor should be. All you've ever seen are predatory
                    apps disguised as creative tools.
                  </p>
                  <p className="text-lg mb-6">
                    A real video editor lets you edit videos. It doesn't steal
                    your content. It doesn't pop up payment dialogs every 5
                    seconds. It doesn't charge you separately for basic features
                    that should be free.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    Yes, this is fucking satire, you fuck
                  </h2>
                  <p className="text-lg mb-6">
                    I'm not actually saying all video editors should be basic as
                    shit. What I'm saying is that all the problems we have with
                    video editing apps are{" "}
                    <strong>ones they create themselves</strong>. Video editors
                    aren't broken by default - they edit videos, export them,
                    and let you use basic features without constantly begging
                    for money. CapCut breaks them. They turn them into payment
                    processors with video editing as a side feature.
                  </p>
                  <p className="text-lg">
                    <em>"Good software gets out of your way."</em>
                    <br />- Some smart motherfucker who definitely wasn't
                    working at CapCut
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                  CapCut?
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Nah, OpenCut’s the Real Deal!
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">The Overhype</h2>
                  <p className="text-lg mb-6">
                    You might be using CapCut and thinking your video editing
                    game is next-level. You’ve got transitions, fonts, effects —
                    it looks cool. But is it actually helping you? Or is it just
                    burying your creativity behind popups, paywalls, and hidden
                    catches? CapCut wants you to believe more effects = better
                    videos. Let me describe what CapCut actually gives you:
                  </p>

                  <p className="text-lg mb-6">
                    <strong>It's a Paywall Parade </strong>
                  </p>
                  <p className="text-lg mb-6">
                    Let’s talk straight: you’re spending hours editing, only to
                    have a watermark slapped on like CapCut made the whole
                    thing. CapCut has one move: ask for money — constantly.
                  </p>
                  <ul className="text-lg space-y-2 mb-6 list-disc list-inside">
                    <li>Want to remove a watermark? Pay up.</li>
                    <li>Want more than a couple fonts? Get the Pro version.</li>
                    <li>
                      Want to export your video in high quality? Yup, pay again.
                    </li>
                  </ul>
                  <p className="text-lg mb-6">
                    It’s like playing a game where every button triggers a
                    subscription prompt. Basic tools are hidden behind premium
                    popups, and even things you’ve already added might suddenly
                    get locked mid-project.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    Their Terms of Service Are… a Bit Much
                  </h2>
                  <p className="text-lg mb-6">
                    Let’s just say this: once you upload your content, CapCut’s
                    terms give them a lot of rights over it. They can use,
                    modify, and share your stuff — even monetize it — and you’re
                    responsible if something goes wrong. That’s not exactly
                    fair, especially for creators trying to protect their work.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    The Frustrating Part? It’s Actually Good
                  </h2>
                  <p className="text-lg mb-6">
                    The editor itself is smooth, easy to use, and kind of great
                    when it works. That’s what makes everything else feel worse.
                    They built something awesome — and wrapped it in roadblocks.
                  </p>
                  <p className="text-lg mb-6">
                    It’s like buying a great bicycle, but every time you pedal,
                    it asks you for a subscription.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    So What’s the Point of this?
                  </h2>
                  <p className="text-lg mb-6">
                    This isn’t just about CapCut. It’s about how creative tools
                    have filled with interruptions, subscriptions, and surprise
                    fees. It doesn’t have to be that way. A good editor lets you
                    create without distractions. It respects your time, your
                    work, and your wallet.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    You Deserve Better
                  </h2>
                  <p className="text-lg mb-6">
                    If CapCut is your first editor, you might think this is just
                    how all video tools work. But it’s not. Real editors don’t
                    stop you every few clicks to ask for money. They let you
                    create freely, own your work, and focus on what matters:
                    your creativity.
                  </p>
                </div>

                <div>
                  <h2 className="text-3xl font-bold mb-6">
                    This is Satire (But Kinda True)
                  </h2>
                  <p className="text-lg mb-6">
                    This page is satire, not meant to attack. But the concerns
                    are real. Creators deserve better tools that don’t put
                    profits before people. There are better options out there.
                    Open-source, free, and transparent tools that don’t hold
                    your work hostage behind a paywall. Make the switch. Create
                    freely.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

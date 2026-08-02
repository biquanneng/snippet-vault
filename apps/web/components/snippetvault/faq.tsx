// SPDX-License-Identifier: MPL-2.0

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/lib/snippetvault/content";
import { SnippetVaultContainer } from "./container";

export function SnippetVaultFaq() {
  return (
    <section id="faq" className="sv-reveal scroll-mt-24 border-b py-20 sm:py-28">
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Clear answers about the current Chrome build, its local data
            boundary, and what remains before public release.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mx-auto mt-12 max-w-3xl border-t"
        >
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`}>
              <AccordionTrigger className="py-6 text-base font-semibold hover:no-underline sm:text-lg">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-6 text-base leading-7 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SnippetVaultContainer>
    </section>
  );
}

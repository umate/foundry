"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PaperPlaneRightIcon, ArrowRightIcon, ChatCenteredDotsIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ClarificationQuestion } from "@/lib/hooks/use-claude-code-chat";

const OTHER_OPTION = "__other__";

interface ClarificationCardProps {
  questions: ClarificationQuestion[];
  onSubmit: (responses: Map<number, string | string[]>) => void;
  disabled?: boolean;
}

export function ClarificationCard({ questions, onSubmit, disabled = false }: ClarificationCardProps) {
  const [selections, setSelections] = useState<Map<number, string | string[]>>(new Map());
  const [otherText, setOtherText] = useState<Map<number, string>>(new Map());
  const [activeTab, setActiveTab] = useState("0");
  const [submitted, setSubmitted] = useState(false);

  const isDisabled = disabled || submitted;

  const currentIndex = parseInt(activeTab, 10);
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentQuestion = questions[currentIndex];

  const isCurrentAnswered = () => {
    const sel = selections.get(currentIndex);
    const other = otherText.get(currentIndex);

    if (currentQuestion?.multiSelect) {
      const arr = (sel as string[]) || [];
      if (arr.length === 0) return false;
      if (arr.includes(OTHER_OPTION) && !other?.trim()) return false;
      return true;
    }

    if (sel === OTHER_OPTION) {
      return !!other?.trim();
    }
    return typeof sel === "string" && sel.length > 0;
  };

  const isAllAnswered = questions.every((q, i) => {
    const sel = selections.get(i);
    const other = otherText.get(i);

    if (q.multiSelect) {
      const arr = (sel as string[]) || [];
      if (arr.length === 0) return false;
      if (arr.includes(OTHER_OPTION) && !other?.trim()) return false;
      return true;
    }

    if (sel === OTHER_OPTION) {
      return !!other?.trim();
    }
    return typeof sel === "string" && sel.length > 0;
  });

  const handleSingleSelect = (questionIndex: number, optionLabel: string) => {
    const newSelections = new Map(selections);
    newSelections.set(questionIndex, optionLabel);
    setSelections(newSelections);

    // Don't auto-advance if "Other" is selected (need to type)
    if (optionLabel === OTHER_OPTION) return;

    // Single question → submit immediately
    if (questions.length === 1) {
      setSubmitted(true);
      onSubmit(new Map([[0, optionLabel]]));
      return;
    }

    // Multi-question: auto-advance to next tab after brief delay
    if (questionIndex < questions.length - 1) {
      setTimeout(() => {
        setActiveTab(String(questionIndex + 1));
      }, 250);
    }
  };

  const handleMultiSelect = (questionIndex: number, optionLabel: string, checked: boolean) => {
    const newSelections = new Map(selections);
    const current = (newSelections.get(questionIndex) as string[]) || [];

    if (checked) {
      newSelections.set(questionIndex, [...current, optionLabel]);
    } else {
      newSelections.set(questionIndex, current.filter((l) => l !== optionLabel));
    }

    setSelections(newSelections);
  };

  const handleOtherTextChange = (questionIndex: number, text: string) => {
    const newOtherText = new Map(otherText);
    newOtherText.set(questionIndex, text);
    setOtherText(newOtherText);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setActiveTab(String(currentIndex + 1));
    }
  };

  const handleSubmit = () => {
    if (submitted) return;

    const finalResponses = new Map<number, string | string[]>();

    questions.forEach((q, i) => {
      const sel = selections.get(i);
      const other = otherText.get(i);

      if (q.multiSelect) {
        const arr = (sel as string[]) || [];
        const resolved = arr.map(s => s === OTHER_OPTION && other ? other : s).filter(s => s !== OTHER_OPTION);
        finalResponses.set(i, resolved);
      } else {
        finalResponses.set(i, sel === OTHER_OPTION && other ? other : (sel as string));
      }
    });

    setSubmitted(true);
    onSubmit(finalResponses);
  };

  // Single question layout
  if (questions.length === 1) {
    const question = questions[0];
    const isOtherSelected = question.multiSelect
      ? ((selections.get(0) as string[]) || []).includes(OTHER_OPTION)
      : selections.get(0) === OTHER_OPTION;

    return (
      <div className={cn(
        "relative my-3 -mx-2 border-2 border-foreground/15 bg-card rounded-md overflow-hidden",
        isDisabled && "opacity-60 pointer-events-none"
      )}>
        <div className="flex items-center px-4 py-2 border-b border-foreground/10 bg-muted/40">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <ChatCenteredDotsIcon weight="bold" className="size-3.5" />
            Quick question
          </div>
        </div>

        <div className="px-4 pt-4 pb-3 space-y-3">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {question.question}
          </h3>

          <QuestionOptions
            question={question}
            questionIndex={0}
            selection={selections.get(0)}
            onSingleSelect={handleSingleSelect}
            onMultiSelect={handleMultiSelect}
            disabled={isDisabled}
          />

          {isOtherSelected && (
            <Input
              placeholder="Type your answer..."
              value={otherText.get(0) || ""}
              onChange={(e) => handleOtherTextChange(0, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isCurrentAnswered() && !isDisabled) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isDisabled}
              className="text-sm"
              autoFocus
            />
          )}

          {(question.multiSelect || isOtherSelected) && (
            <Button
              onClick={handleSubmit}
              disabled={!isCurrentAnswered() || isDisabled}
              className="w-full"
              size="sm"
            >
              <PaperPlaneRightIcon weight="bold" className="size-4" />
              Submit
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Multiple questions layout with tabs inside card
  const isOtherSelected = currentQuestion?.multiSelect
    ? ((selections.get(currentIndex) as string[]) || []).includes(OTHER_OPTION)
    : selections.get(currentIndex) === OTHER_OPTION;

  return (
    <div className={cn(
      "relative my-3 -mx-2 border-2 border-foreground/15 bg-card rounded-md overflow-hidden",
      isDisabled && "opacity-60 pointer-events-none"
    )}>
      <div className="flex items-center px-4 py-2 border-b border-foreground/10 bg-muted/40">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <ChatCenteredDotsIcon weight="bold" className="size-3.5" />
          Quick question
        </div>
      </div>

      <div className="px-4 pt-3 pb-3 space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {questions.map((q, i) => (
              <TabsTrigger key={i} value={String(i)} className="shrink-0">
                {q.header}
              </TabsTrigger>
            ))}
          </TabsList>

          {questions.map((question, questionIndex) => {
            const isOther = question.multiSelect
              ? ((selections.get(questionIndex) as string[]) || []).includes(OTHER_OPTION)
              : selections.get(questionIndex) === OTHER_OPTION;

            return (
              <TabsContent key={questionIndex} value={String(questionIndex)} className="mt-3 space-y-3">
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {question.question}
                </h3>

                <QuestionOptions
                  question={question}
                  questionIndex={questionIndex}
                  selection={selections.get(questionIndex)}
                  onSingleSelect={handleSingleSelect}
                  onMultiSelect={handleMultiSelect}
                  disabled={isDisabled}
                />

                {isOther && (
                  <Input
                    placeholder="Type your answer..."
                    value={otherText.get(questionIndex) || ""}
                    onChange={(e) => handleOtherTextChange(questionIndex, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isCurrentAnswered() && !isDisabled) {
                        e.preventDefault();
                        if (isLastQuestion) {
                          handleSubmit();
                        } else {
                          handleNext();
                        }
                      }
                    }}
                    disabled={isDisabled}
                    className="text-sm"
                    autoFocus
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Next button for multiSelect or Other (non-last question) */}
        {(currentQuestion?.multiSelect || isOtherSelected) && !isLastQuestion && (
          <Button
            onClick={handleNext}
            disabled={!isCurrentAnswered() || isDisabled}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <ArrowRightIcon weight="bold" className="size-4" />
            Next
          </Button>
        )}

        {isLastQuestion && (
          <Button
            onClick={handleSubmit}
            disabled={!isAllAnswered || isDisabled}
            className="w-full"
            size="sm"
          >
            <PaperPlaneRightIcon weight="bold" className="size-4" />
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}

// Shared component for rendering options
function QuestionOptions({
  question,
  questionIndex,
  selection,
  onSingleSelect,
  onMultiSelect,
  disabled
}: {
  question: ClarificationQuestion;
  questionIndex: number;
  selection: string | string[] | undefined;
  onSingleSelect: (qi: number, label: string) => void;
  onMultiSelect: (qi: number, label: string, checked: boolean) => void;
  disabled: boolean;
}) {
  if (question.multiSelect) {
    const selectedLabels = (selection as string[]) || [];

    return (
      <div className="flex flex-col gap-0.5">
        {question.options.map((option, optionIndex) => (
          <label
            key={optionIndex}
            className={cn(
              "flex items-start gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer transition-colors hover:bg-muted/50",
              selectedLabels.includes(option.label) && "bg-muted",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Checkbox
              checked={selectedLabels.includes(option.label)}
              onCheckedChange={(checked) =>
                onMultiSelect(questionIndex, option.label, checked === true)
              }
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-mono leading-tight">{option.label}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground leading-tight mt-0.5">{option.description}</div>
              )}
            </div>
          </label>
        ))}

        {/* Other option */}
        <label
          className={cn(
            "flex items-start gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer transition-colors hover:bg-muted/50",
            selectedLabels.includes(OTHER_OPTION) && "bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Checkbox
            checked={selectedLabels.includes(OTHER_OPTION)}
            onCheckedChange={(checked) =>
              onMultiSelect(questionIndex, OTHER_OPTION, checked === true)
            }
            disabled={disabled}
            className="mt-0.5"
          />
          <div className="text-sm font-mono text-muted-foreground">Other</div>
        </label>
      </div>
    );
  }

  // Single select with RadioGroup
  return (
    <RadioGroup
      value={(selection as string) || ""}
      onValueChange={(value) => onSingleSelect(questionIndex, value)}
      disabled={disabled}
      className="gap-0.5"
    >
      {question.options.map((option, optionIndex) => (
        <label
          key={optionIndex}
          className={cn(
            "flex items-start gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer transition-colors hover:bg-muted/50",
            selection === option.label && "bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <RadioGroupItem value={option.label} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-mono leading-tight">{option.label}</div>
            {option.description && (
              <div className="text-xs text-muted-foreground leading-tight mt-0.5">{option.description}</div>
            )}
          </div>
        </label>
      ))}

      {/* Other option */}
      <label
        className={cn(
          "flex items-start gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer transition-colors hover:bg-muted/50",
          selection === OTHER_OPTION && "bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <RadioGroupItem value={OTHER_OPTION} className="mt-0.5" />
        <div className="text-sm font-mono text-muted-foreground">Other</div>
      </label>
    </RadioGroup>
  );
}

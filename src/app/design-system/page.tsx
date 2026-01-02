"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Gear,
  User,
  Heart,
  Star,
  Trash,
  PencilSimple,
  Check,
  X,
  Lightning,
} from "@phosphor-icons/react";

export default function DesignSystemPage() {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold uppercase tracking-wider">
            Design System
          </h1>
          <p className="text-muted-foreground font-mono">
            Foundry&apos;s component library with retro/industrial aesthetic
          </p>
        </div>

        {/* Colors */}
        <Section title="Colors">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Primary" className="bg-primary text-primary-foreground" />
            <ColorSwatch name="Secondary" className="bg-secondary text-secondary-foreground" />
            <ColorSwatch name="Background" className="bg-background border text-foreground" />
            <ColorSwatch name="Card" className="bg-card border text-card-foreground" />
            <ColorSwatch name="Muted" className="bg-muted text-muted-foreground" />
            <ColorSwatch name="Accent" className="bg-accent text-accent-foreground" />
            <ColorSwatch name="Destructive" className="bg-destructive text-white" />
            <ColorSwatch name="Border" className="bg-border text-foreground" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Heading Style
              </p>
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                Space Mono Uppercase
              </h2>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Body Text
              </p>
              <p className="font-mono">
                All text uses Space Mono, a monospace font that gives the UI its
                distinctive industrial feel.
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Muted Text
              </p>
              <p className="text-muted-foreground font-mono">
                Secondary information uses muted foreground color.
              </p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Variants
              </p>
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Sizes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                With Icons
              </p>
              <div className="flex flex-wrap gap-3">
                <Button>
                  <Plus weight="bold" /> Create
                </Button>
                <Button variant="secondary">
                  <Gear weight="bold" /> Settings
                </Button>
                <Button variant="destructive">
                  <Trash weight="bold" /> Delete
                </Button>
                <Button variant="outline">
                  <PencilSimple weight="bold" /> Edit
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Icon Only
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="icon">
                  <Plus weight="bold" />
                </Button>
                <Button size="icon" variant="secondary">
                  <Heart weight="bold" />
                </Button>
                <Button size="icon" variant="outline">
                  <Star weight="bold" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Gear weight="bold" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                States
              </p>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Variants
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                With Icons
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge>
                  <Check weight="bold" /> Approved
                </Badge>
                <Badge variant="secondary">
                  <Lightning weight="bold" /> Active
                </Badge>
                <Badge variant="destructive">
                  <X weight="bold" /> Rejected
                </Badge>
              </div>
            </div>
          </div>
        </Section>

        {/* Form Controls */}
        <Section title="Form Controls">
          <div className="space-y-6 max-w-md">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Input
              </p>
              <Input placeholder="Enter your name..." />
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Textarea
              </p>
              <Textarea placeholder="Write a description..." />
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Select
              </p>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Checkbox
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={checkboxChecked}
                  onCheckedChange={(checked) =>
                    setCheckboxChecked(checked as boolean)
                  }
                />
                <label
                  htmlFor="terms"
                  className="font-mono text-sm cursor-pointer"
                >
                  Accept terms and conditions
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Switch
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  id="notifications"
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
                <label
                  htmlFor="notifications"
                  className="font-mono text-sm cursor-pointer"
                >
                  Enable notifications
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* Tabs */}
        <Section title="Tabs">
          <Tabs defaultValue="overview" className="max-w-md">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <p className="font-mono text-sm text-muted-foreground">
                This is the overview tab content. Note the uppercase, monospace
                styling on the triggers.
              </p>
            </TabsContent>
            <TabsContent value="features" className="pt-4">
              <p className="font-mono text-sm text-muted-foreground">
                Features tab content goes here.
              </p>
            </TabsContent>
            <TabsContent value="settings" className="pt-4">
              <p className="font-mono text-sm text-muted-foreground">
                Settings tab content goes here.
              </p>
            </TabsContent>
          </Tabs>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Alpha</CardTitle>
                <CardDescription>A sample project card</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm">
                  Cards use the card background color with a subtle border and
                  rounded corners.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">
                  <User weight="bold" /> View
                </Button>
                <Button size="sm" variant="outline">
                  <PencilSimple weight="bold" /> Edit
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Request</CardTitle>
                <CardDescription>Status: In Progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Active</Badge>
                  <Badge variant="outline">Priority</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="secondary">
                  <Check weight="bold" /> Approve
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* Design Principles */}
        <Section title="Design Principles">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wide">
                Industrial Aesthetic
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                Monospace typography, rectangular shapes, and muted earth tones
                create a utilitarian, industrial feel.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wide">
                High Contrast
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                Black primary on sage background ensures readability and visual
                hierarchy.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wide">
                Orange Accent
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                The secondary orange color (#E85102) is used sparingly for CTAs
                and important actions.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wide">
                Minimal Rounding
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                Components use rounded-sm or rounded-md, avoiding the rounded-full
                pill shapes common in other systems.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold uppercase tracking-wider border-b-2 border-foreground pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorSwatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <div
        className={`h-16 rounded-md flex items-center justify-center font-mono text-sm uppercase tracking-wide ${className}`}
      >
        {name}
      </div>
    </div>
  );
}

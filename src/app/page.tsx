"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Gear,
  CreditCard,
  SignOut,
  DotsThree,
  Plus,
  Trash,
  PencilSimple,
  MagnifyingGlass,
  Download,
  Upload,
  Heart,
  Share,
  Check,
  GoogleLogo,
  EnvelopeSimple,
  Lock,
  Bell,
  CaretDown,
} from "@phosphor-icons/react";

export default function Home() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
          {/* Header */}
          <div className="mb-12 space-y-2">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Design System
            </h1>
            <p className="text-muted-foreground text-lg">Component showcase</p>
          </div>

          {/* Buttons Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Buttons</h2>

            <Card>
              <CardHeader>
                <CardTitle>Variants & Sizes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button disabled>Disabled</Button>
                  <Button variant="secondary" disabled>
                    Disabled
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>With Icons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button>
                    <Plus weight="bold" /> Create
                  </Button>
                  <Button variant="secondary">
                    <Download weight="bold" /> Download
                  </Button>
                  <Button variant="outline">
                    <MagnifyingGlass weight="bold" /> Search
                  </Button>
                  <Button variant="destructive">
                    <Trash weight="bold" /> Delete
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="icon">
                    <Plus weight="bold" />
                  </Button>
                  <Button size="icon" variant="secondary">
                    <Heart weight="bold" />
                  </Button>
                  <Button size="icon" variant="outline">
                    <Share weight="bold" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <PencilSimple weight="bold" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Badges Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Badges</h2>

            <Card>
              <CardHeader>
                <CardTitle>Badge Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Form Controls Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Form Controls</h2>

            <Card>
              <CardHeader>
                <CardTitle>Inputs & Selects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Text Input</label>
                    <Input type="text" placeholder="Enter text..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option1">Option 1</SelectItem>
                        <SelectItem value="option2">Option 2</SelectItem>
                        <SelectItem value="option3">Option 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Textarea</label>
                  <Textarea
                    placeholder="Enter your message here..."
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" />
                    <label htmlFor="terms" className="text-sm font-medium">
                      Accept terms and conditions
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="notifications" />
                    <label
                      htmlFor="notifications"
                      className="text-sm font-medium"
                    >
                      Enable notifications
                    </label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Radio Group</label>
                  <RadioGroup defaultValue="option1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option1" id="r1" />
                      <label htmlFor="r1" className="text-sm">
                        Option 1
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option2" id="r2" />
                      <label htmlFor="r2" className="text-sm">
                        Option 2
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option3" id="r3" />
                      <label htmlFor="r3" className="text-sm">
                        Option 3
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Tabs Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Tabs</h2>

            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="account">
                  <TabsList>
                    <TabsTrigger value="account"><User weight="bold" /> Account</TabsTrigger>
                    <TabsTrigger value="password"><Lock weight="bold" /> Password</TabsTrigger>
                    <TabsTrigger value="settings"><Gear weight="bold" /> Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account" className="mt-4 space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Manage your account settings and preferences.
                    </p>
                    <Input placeholder="Username" />
                  </TabsContent>
                  <TabsContent value="password" className="mt-4 space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Change your password here.
                    </p>
                    <Input type="password" placeholder="New password" />
                  </TabsContent>
                  <TabsContent value="settings" className="mt-4 space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Configure your application settings.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Switch id="dark-mode" />
                      <label htmlFor="dark-mode" className="text-sm">
                        Dark mode
                      </label>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          {/* Dialog & Dropdown Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Overlays</h2>

            <Card>
              <CardHeader>
                <CardTitle>Dialog & Dropdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                        <DialogDescription>
                          This is a dialog description. You can put any content
                          here.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Input placeholder="Enter something..." />
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Open Menu <CaretDown weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <User /> Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Gear /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CreditCard /> Billing
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <SignOut /> Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover Me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a tooltip</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Avatar Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Avatars</h2>

            <Card>
              <CardHeader>
                <CardTitle>Avatar Sizes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-14 w-14">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>CD</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-14 w-14">
                    <AvatarFallback>EF</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Cards Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Cards</h2>

            <Card>
              <CardHeader>
                <CardTitle>Card with Footer</CardTitle>
                <CardDescription>
                  A card component with header, content, and footer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Cards can contain any content and support multiple sections.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </CardFooter>
            </Card>
          </section>

          {/* Example Pages Section */}
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-semibold">Example Layouts</h2>

            {/* Login Form Example */}
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <EnvelopeSimple className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <label htmlFor="remember" className="text-sm">
                    Remember me
                  </label>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button className="w-full">Sign In</Button>
                <Button variant="outline" className="w-full">
                  <GoogleLogo weight="bold" /> Continue with Google
                </Button>
              </CardFooter>
            </Card>

            {/* Pricing Card Example */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pro Plan</CardTitle>
                  <Badge variant="secondary">Popular</Badge>
                </div>
                <CardDescription>
                  Everything you need to grow your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <Separator />
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check weight="bold" className="text-secondary" /> Unlimited
                    projects
                  </li>
                  <li className="flex items-center gap-2">
                    <Check weight="bold" className="text-secondary" /> Advanced
                    analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <Check weight="bold" className="text-secondary" /> Priority
                    support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check weight="bold" className="text-secondary" /> Custom
                    integrations
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full">
                  Get Started
                </Button>
              </CardFooter>
            </Card>

            {/* User Profile Card Example */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Jane Doe</h3>
                      <Badge variant="outline">Admin</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      jane.doe@example.com
                    </p>
                    <p className="text-sm">
                      Product designer with 10+ years of experience in creating
                      user-centered digital products.
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <DotsThree weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <User /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <PencilSimple /> Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <SignOut /> Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings Example */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
                      <EnvelopeSimple className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">
                        Email Notifications
                      </label>
                      <p className="text-muted-foreground text-xs">
                        Receive emails about your account activity
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">
                        Push Notifications
                      </label>
                      <p className="text-muted-foreground text-xs">
                        Receive push notifications on your device
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">
                        Marketing Emails
                      </label>
                      <p className="text-muted-foreground text-xs">
                        Receive emails about new features and updates
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>

            {/* Contact Form Example */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
                <CardDescription>
                  Send us a message and we&apos;ll get back to you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Tell us how we can help..."
                    rows={5}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  <EnvelopeSimple weight="bold" /> Send Message
                </Button>
              </CardFooter>
            </Card>

            {/* Data Table Example */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                      A list of your recent orders
                    </CardDescription>
                  </div>
                  <Button size="sm">
                    <Download weight="bold" /> Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: "#3210",
                      customer: "Olivia Martin",
                      status: "Shipped",
                      amount: "$42.25",
                    },
                    {
                      id: "#3209",
                      customer: "Ava Johnson",
                      status: "Processing",
                      amount: "$74.99",
                    },
                    {
                      id: "#3208",
                      customer: "Michael Chen",
                      status: "Delivered",
                      amount: "$129.00",
                    },
                  ].map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {order.customer
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{order.customer}</p>
                          <p className="text-muted-foreground text-xs">
                            {order.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            order.status === "Delivered"
                              ? "default"
                              : order.status === "Shipped"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {order.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {order.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

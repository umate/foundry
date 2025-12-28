import { ChatInterface } from '@/components/chat';

export default function ChatPage() {
  return (
    <div className="container mx-auto max-w-4xl h-screen flex flex-col py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground mt-2">
          Conversational AI assistant
        </p>
      </div>
      <div className="flex-1 border-2 border-border rounded-md overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}

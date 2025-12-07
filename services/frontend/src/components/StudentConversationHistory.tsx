import { useState } from "react";
import { Conversation, Message } from "../App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { MessageSquare, Clock, Archive, Trash2, ArrowLeft, Bot, User, PlayCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner@2.0.3";

type StudentConversationHistoryProps = {
  conversations: Conversation[];
  studentName: string;
  onBack: () => void;
  onContinueConversation: (conversation: Conversation) => void;
  onUpdateConversation: (id: string, updatedConversation: Partial<Conversation>) => void;
  onDeleteConversation: (id: string) => void;
};

export function StudentConversationHistory({
  conversations,
  studentName,
  onBack,
  onContinueConversation,
  onUpdateConversation,
  onDeleteConversation,
}: StudentConversationHistoryProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [deletingConversation, setDeletingConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Filter conversations for this student
  const studentConversations = conversations.filter(
    conv => conv.studentName === studentName
  );

  const activeConversations = studentConversations.filter(conv => !conv.archived);
  const archivedConversations = studentConversations.filter(conv => conv.archived);

  const handleArchive = (conversation: Conversation) => {
    onUpdateConversation(conversation.id, { archived: !conversation.archived });
    toast.success(conversation.archived ? "Conversation restored" : "Conversation archived");
  };

  const handleDelete = () => {
    if (deletingConversation) {
      onDeleteConversation(deletingConversation.id);
      setDeletingConversation(null);
      setSelectedConversation(null);
      toast.success("Conversation deleted");
    }
  };

  const handleContinue = (conversation: Conversation) => {
    if (conversation.archived) {
      toast.error("Please restore the conversation from archive first");
      return;
    }
    onContinueConversation(conversation);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getConversationPreview = (messages: Message[]) => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    return lastUserMessage?.content || "No messages";
  };

  if (selectedConversation) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                {!selectedConversation.archived && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleContinue(selectedConversation)}
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Continue
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(selectedConversation)}
                >
                  <Archive className="w-4 h-4 mr-1" />
                  {selectedConversation.archived ? "Restore" : "Archive"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingConversation(selectedConversation)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
            <CardTitle className="mt-2">Conversation Details</CardTitle>
            <CardDescription>
              {formatTimestamp(selectedConversation.timestamp)} • {selectedConversation.messages.length} messages
            </CardDescription>
          </CardHeader>
        </Card>

        <ScrollArea className="h-[calc(100vh-300px)] pr-2">
          <div className="space-y-4">
            {selectedConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-green-700" />
                  </div>
                )}
                <div className={`flex-1 ${message.role === "user" ? "flex justify-end" : ""}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "bg-green-700 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    {message.editedByTeacher && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Reviewed by teacher
                      </Badge>
                    )}
                    {message.relatedPlans && message.relatedPlans.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Related lessons:</p>
                        {message.relatedPlans.map((planTitle, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs mr-1 mb-1">
                            {planTitle}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Show rating on assistant messages */}
                    {message.role === "assistant" && message.rating && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <Badge 
                          variant="outline" 
                          className={message.rating === "helpful" 
                            ? "text-green-700 border-green-300 bg-green-50" 
                            : "text-red-700 border-red-300 bg-red-50"
                          }
                        >
                          {message.rating === "helpful" ? (
                            <>
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              You found this helpful
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              You found this not helpful
                            </>
                          )}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingConversation} onOpenChange={() => setDeletingConversation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this conversation?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                My Conversations
              </CardTitle>
              <CardDescription className="mt-1">
                {activeConversations.length} active, {archivedConversations.length} archived
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active ({activeConversations.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedConversations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeConversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No active conversations</p>
              <p className="text-sm">Start chatting with the AI assistant to see your conversations here</p>
            </div>
          ) : (
            activeConversations.map(conversation => (
              <Card
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConversation(conversation)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      Conversation
                    </CardTitle>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(conversation.timestamp)}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {getConversationPreview(conversation.messages)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {conversation.messages.length} messages
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContinue(conversation);
                        }}
                      >
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Continue
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(conversation);
                        }}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4 space-y-3">
          {archivedConversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No archived conversations</p>
              <p className="text-sm">Archive conversations to keep your active list organized</p>
            </div>
          ) : (
            archivedConversations.map(conversation => (
              <Card
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow opacity-75"
                onClick={() => setSelectedConversation(conversation)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      Conversation
                    </CardTitle>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(conversation.timestamp)}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {getConversationPreview(conversation.messages)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {conversation.messages.length} messages
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(conversation);
                        }}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingConversation(conversation);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingConversation} onOpenChange={() => setDeletingConversation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
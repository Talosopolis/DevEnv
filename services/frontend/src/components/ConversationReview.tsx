import { useState } from "react";
import { Conversation, Message } from "../App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { MessageSquare, Bot, User, Clock, Edit2, Save, X, CheckCircle, ArrowLeft, ThumbsUp, ThumbsDown, TrendingUp } from "lucide-react";
import { toast } from "sonner@2.0.3";

type ConversationReviewProps = {
  conversations: Conversation[];
  onUpdateConversation: (id: string, updatedConversation: Partial<Conversation>) => void;
  onBack: () => void;
};

export function ConversationReview({ conversations, onUpdateConversation, onBack }: ConversationReviewProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditedContent(message.content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (!selectedConversation) return;

    const updatedMessages = selectedConversation.messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          originalContent: msg.editedByTeacher ? msg.originalContent : msg.content,
          content: editedContent,
          editedByTeacher: true
        };
      }
      return msg;
    });

    const updatedConversation = {
      ...selectedConversation,
      messages: updatedMessages
    };

    onUpdateConversation(selectedConversation.id, { messages: updatedMessages });
    setSelectedConversation(updatedConversation);
    setEditingMessageId(null);
    toast.success("Response updated successfully");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (selectedConversation) {
    // Calculate rating statistics for this conversation
    const assistantMessages = selectedConversation.messages.filter(m => m.role === "assistant");
    const ratedMessages = assistantMessages.filter(m => m.rating);
    const helpfulCount = ratedMessages.filter(m => m.rating === "helpful").length;
    const notHelpfulCount = ratedMessages.filter(m => m.rating === "not-helpful").length;
    const ratingPercentage = ratedMessages.length > 0 
      ? Math.round((helpfulCount / ratedMessages.length) * 100)
      : null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <CardTitle className="mt-2">Conversation Review</CardTitle>
            <CardDescription>
              {selectedConversation.studentName} • {formatTimestamp(selectedConversation.timestamp)}
            </CardDescription>
            
            {/* Rating Stats */}
            {ratedMessages.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Student Feedback</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{helpfulCount} helpful</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm">{notHelpfulCount} not helpful</span>
                  </div>
                  {ratingPercentage !== null && (
                    <Badge variant={ratingPercentage >= 70 ? "default" : "secondary"}>
                      {ratingPercentage}% positive
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        <ScrollArea className="h-[calc(100vh-320px)] pr-2">
          <div className="space-y-4">
            {selectedConversation.messages.map((message) => (
              <div key={message.id}>
                <div
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
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            rows={6}
                            className="text-sm bg-white"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(message.id)}>
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          {message.editedByTeacher && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Edited by teacher
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    
                    {message.role === "assistant" && editingMessageId !== message.id && (
                      <>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditMessage(message)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit Response
                          </Button>
                          
                          {/* Show student rating */}
                          {message.rating && (
                            <div className="flex items-center gap-1">
                              {message.rating === "helpful" ? (
                                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  Helpful
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                                  <ThumbsDown className="w-3 h-3 mr-1" />
                                  Not helpful
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {message.editedByTeacher && message.originalContent && editingMessageId !== message.id && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-gray-500">View original</summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-gray-600">
                          {message.originalContent}
                        </div>
                      </details>
                    )}

                    {message.relatedLessonPlans && message.relatedLessonPlans.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.relatedLessonPlans.slice(0, 2).map((planId, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            📚 Lesson referenced
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
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
                AI Assistant Conversations
              </CardTitle>
              <CardDescription className="mt-1">
                Review and edit AI responses to ensure accuracy
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Statistics */}
      {conversations.length > 0 && (() => {
        const allAssistantMessages = conversations.flatMap(c => 
          c.messages.filter(m => m.role === "assistant")
        );
        const allRatedMessages = allAssistantMessages.filter(m => m.rating);
        const totalHelpful = allRatedMessages.filter(m => m.rating === "helpful").length;
        const totalNotHelpful = allRatedMessages.filter(m => m.rating === "not-helpful").length;
        const overallRating = allRatedMessages.length > 0
          ? Math.round((totalHelpful / allRatedMessages.length) * 100)
          : 0;

        return allRatedMessages.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4" />
                Overall Student Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-2xl">{totalHelpful}</div>
                    <div className="text-xs text-gray-500">Helpful</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="text-2xl">{totalNotHelpful}</div>
                    <div className="text-xs text-gray-500">Not Helpful</div>
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <Badge 
                    variant={overallRating >= 70 ? "default" : "secondary"}
                    className="text-lg px-3 py-1"
                  >
                    {overallRating}% Positive
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      <div className="space-y-3 pb-4">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No conversations yet</p>
            <p className="text-sm">Student conversations with the AI assistant will appear here</p>
          </div>
        ) : (
          conversations.map(conversation => {
            const assistantMessages = conversation.messages.filter(m => m.role === "assistant");
            const editedCount = assistantMessages.filter(m => m.editedByTeacher).length;
            const ratedMessages = assistantMessages.filter(m => m.rating);
            const helpfulCount = ratedMessages.filter(m => m.rating === "helpful").length;
            
            return (
              <Card
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConversation(conversation)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{conversation.studentName}</CardTitle>
                    <div className="flex gap-1">
                      {editedCount > 0 && (
                        <Badge variant="secondary" className="shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {editedCount} edited
                        </Badge>
                      )}
                      {ratedMessages.length > 0 && (
                        <Badge variant="outline" className="shrink-0">
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          {helpfulCount}/{ratedMessages.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {conversation.messages.length} messages • {formatTimestamp(conversation.timestamp)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {conversation.messages[conversation.messages.length - 1]?.content || "No messages"}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
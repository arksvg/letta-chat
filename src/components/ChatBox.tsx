import React, { useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import axios from "axios";

const API_BASE = "https://18.116.74.207:8283/v1";

type MessageRole = "user" | "assistant" | "tool" | "log";

interface Message {
  role: MessageRole;
  content: string;
}

interface Agent {
  id: string;
  name: string | null;
}

interface Props {
  agentId: string;
  splitCount: number;
  agentname?: string | null;
  agents: Agent[];
  handleResetMessages: (agentId: string) => void;
  handleSelectAgent: (agentId: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlainJsonContent(content?: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      ("type" in parsed || "reason" in parsed || "message" in parsed)
    );
  } catch {
    return false;
  }
}

export const ChatBox: React.FC<Props> = ({
  agents,
  splitCount,
  handleResetMessages,
  handleSelectAgent,
  agentname,
  agentId,
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [collapsedStates, setCollapsedStates] = useState<
    Record<number, boolean>
  >({});
  const [loadingChats, setLoadingChats] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const extractFunctionName = (content: string): string => {
    // Tool Call content example: "🔧 Tool Call: open_files({args})"
    const match = content.match(/Tool Call:\s*([^(]+)/);
    return match ? match[1].trim() : "Tool Call";
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoadingChats(true); // Show loader
      const res = await axios.get(
        `${API_BASE}/agents/${agentId}/messages?limit=50`,
        {
          headers: { Authorization: `Bearer password` },
        }
      );

      const validMessages = res.data
        .map((m: any) => {
          let role: MessageRole;
          let content: string | null = null;

          switch (m.message_type) {
            case "user_message":
              role = "user";
              content = m.content;
              break;
            case "assistant_message":
              role = "assistant";
              content = m.content;
              break;
            case "tool_call_message":
              role = "tool";
              content = `🔧 Tool Call: ${m.tool_call?.name}(${m.tool_call?.arguments})`;
              break;
            case "tool_return_message":
              role = "log";
              content = `✅ Tool Response: ${
                m.tool_return || "Processing..."
              }`;
              break;
            default:
              return null;
          }

          if (typeof content === "string" && content.trim().startsWith("{")) {
            try {
              const parsed = JSON.parse(content);
              if (parsed?.type) return null;
            } catch {}
          }

          return { role, content };
        })
        .filter((msg: Message): msg is Message => !!msg && !!msg.content);

      setMessages(validMessages);

      // 👇 initialize collapsedStates: all collapsible items closed
      const initialCollapsed: Record<number, boolean> = {};
      validMessages.forEach((msg: Message, idx: number) => {
        if (msg.role === "tool" || msg.role === "log") {
          initialCollapsed[idx] = true;
        }
      });
      setCollapsedStates(initialCollapsed);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoadingChats(false);
    }
  };
  useEffect(() => {
    if (agentId) fetchMessages();
  }, [agentId]);
// CALL OTHER MESSAGES
  // const refreshOtherAgentsMessages = async (currentAgentId: string) => {
  //   try {
  //     await Promise.all(
  //       agents
  //         .filter((agent) => agent.id !== currentAgentId)
  //         .map(async (agent) => {
  //           try {
  //             const res = await axios.get(
  //               `${API_BASE}/agents/${agent.id}/messages?limit=50`,
  //               {
  //                 headers: { Authorization: `Bearer password` },
  //               }
  //             );
  //             console.log(
  //               `Refreshed messages for agent: ${agent.id}`,
  //               res.data
  //             );
  //           } catch (err) {
  //             console.error(`Error refreshing messages for ${agent.id}:`, err);
  //           }
  //         })
  //     );
  //   } catch (error) {
  //     console.error("Error refreshing other agents' messages:", error);
  //   }
  // };
  
  // const sendMessage = async () => {
  //   if (!input.trim()) return;

  //   const userMsg: Message = { role: "user", content: input };
  //   setMessages((prev) => [...prev, userMsg]);
  //   setInput("");
  //   setIsStreaming(true);

  //   let assistantMsg: Message = { role: "assistant", content: "" };
  //   setMessages((prev) => [...prev, assistantMsg]);

  //   const ctrl = new AbortController();

  //   await fetchEventSource(`${API_BASE}/agents/${agentId}/messages/stream`, {
  //     openWhenHidden: true,
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Accept: "text/event-stream",
  //       Authorization: "Bearer password",
  //     },
  //     body: JSON.stringify({ messages: [{ role: "user", content: input }] }),
  //     signal: ctrl.signal,
  //     onmessage(ev) {
  //       if (ev.data === "[DONE]") {
  //         setIsStreaming(false);

  //         refreshOtherAgentsMessages(agentId);
  //         return;
  //       }

  //       const data = JSON.parse(ev.data);

  //       if (
  //         data.message_type === "assistant_message" &&
  //         !isPlainJsonContent(data.content)
  //       ) {
  //         const token = data.content;

  //         setMessages((prev) => {
  //           const updated = [...prev];
  //           const last = updated[updated.length - 1];

  //           if (last && last.role === "assistant") {
  //             last.content += token;
  //           }

  //           return [...updated];
  //         });
  //       } else if (data.message_type === "tool_call_message") {
  //         setMessages((prev) => [
  //           ...prev,
  //           {
  //             role: "tool",
  //             content: `🛠️ Tool Call: ${
  //               data.tool_call?.name ?? "unknown"
  //             }\n\`\`\`json\n${data.tool_call?.arguments ?? ""}\n\`\`\``,
  //           },
  //         ]);
  //       } else if (data.message_type === "tool_return_message") {
  //         setMessages((prev) => [
  //           ...prev,
  //           {
  //             role: "log",
  //             content: `📄 Tool Returned:\n\`\`\`json\n${
  //               data.tool_return ?? ""
  //             }\n\`\`\``,
  //           },
  //         ]);
  //       }
  //     },
  //     onclose() {
  //       setIsStreaming(false);
  //     },
  //     onerror(err) {
  //       console.error("Streaming error:", err);
  //       setIsStreaming(false);
  //       ctrl.abort();
  //     },
  //   });
  // };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    let assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    const ctrl = new AbortController();
    await fetchEventSource(`${API_BASE}/agents/${agentId}/messages/stream`, {
      openWhenHidden: true,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: "Bearer password",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: input }] }),
      signal: ctrl.signal,
      async onmessage(ev) {
        if (ev.data === "[DONE]") {
          setIsStreaming(false);
          return;
        }

        const data = JSON.parse(ev.data);

        if (
          data.message_type === "assistant_message" &&
          !isPlainJsonContent(data.content)
        ) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.content,
            },
          ]);
        } else if (data.message_type === "tool_call_message") {
          setMessages((prev) => [
            ...prev,
            {
              role: "tool",
              content: `🔧 Tool Call: ${data.tool_call?.name}(${data.tool_call?.arguments})`,
            },
          ]);
        } else if (data.message_type === "tool_return_message") {
          setMessages((prev) => [
            ...prev,
            {
              role: "log",
              content: `✅ Tool Response: ${
                data.tool_return || "Processing..."
              }`,
            },
          ]);
        }
      },
      onclose() {
        setIsStreaming(false);
      },
      onerror(err) {
        console.error("Streaming error:", err);
        setIsStreaming(false);
        ctrl.abort();
      },
    });
  };

  const toggleCollapse = (index: number) => {
    setCollapsedStates((prev) => {
      const newState = { ...prev };
      newState[index] = !newState[index];
      return newState;
    });
  };

  const handleRefresh = async () => {
    fetchMessages();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="px-4 py-3 items-center bg-white shadow-sm flex font-bold text-gray-700">
        {!isSidebarOpen && splitCount === 1 && (
          <button
            className="text-black px-3 py-1 rounded-md hover:bg-blue-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            ☰
          </button>
        )}
        <img src="./logo.png" className="h-8 mr-2" alt="logo" /> |&nbsp;
        <div className="flex items-center space-x-2">
          <select
            value={agentId}
            onChange={(e) => handleSelectAgent(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent?.name?.charAt(0).toUpperCase() + agent.name?.slice(1)!}
              </option>
            ))}
          </select>

          <div className="flex space-x-2">
            <button
              onClick={() => handleRefresh()}
              className="px-3 py-2 text-blue-500 hover:text-blue-700"
              title="Refresh Agent"
            >
              ⟳
            </button>
            <button
              onClick={() => handleResetMessages(agentId)}
              className=" text-red-500 hover:text-red-700"
              title="Reset Messages"
            >
              ⮌
            </button>

            
          </div>
        </div>
      </div>

      {loadingChats ? (
        <div className="flex-1 flex items-center justify-center text-xl text-gray-500">
          Loading chats...
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => {
                const isCollapsible = msg.role === "tool" || msg.role === "log";
                const isCollapsed = collapsedStates[idx] ?? true;

                return (
                  <div
                    key={idx}
                    className={`flex items-start ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <img
                        src="/ai.png"
                        alt="AI"
                        className="w-10 h-10 rounded-full mr-2 border"
                      />
                    )}

                    <div
                      className={`px-4 py-2 rounded-lg text-sm whitespace-pre-wrap break-words max-w-[70%] overflow-hidden ${
                        msg.role === "assistant"
                          ? "bg-gray-200 text-gray-900"
                          : msg.role === "tool"
                          ? "bg-yellow-100 text-gray-800"
                          : msg.role === "log"
                          ? "bg-green-100 text-gray-800"
                          : "bg-blue-500 text-white text-right"
                      }`}
                    >
                      {isCollapsible ? (
                        <div>
                          <button
                            type="button"
                            className="flex items-center font-semibold mb-1"
                            onClick={() => toggleCollapse(idx)}
                          >
                            <span className="mr-1">
                              {isCollapsed ? ">" : "˅"}
                            </span>
                            {msg.role === "tool"
                              ? extractFunctionName(msg.content)
                              : "Response"}
                          </button>
                          {!isCollapsed && (
                            <div className="mt-1 border-t pt-1 text-xs">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {msg.role === "user" && (
                      <img
                        src="/user.png"
                        alt="User"
                        className="w-10 h-10 rounded-full ml-2 border"
                      />
                    )}
                  </div>
                );
              })}

              {isStreaming && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm animate-pulse">
                    ...
                  </div>
                </div>
              )}
              <div ref={bottomRef}></div>
            </div>
          </div>

          <div className="border-t bg-white px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                className="flex-1 rounded-md border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black-500"
                placeholder="Type a Message Here ..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isStreaming && sendMessage()
                }
                disabled={isStreaming}
              />
              <button
                className="bg-gray-800 text-white px-4 py-2 rounded-md disabled:bg-gray-300"
                onClick={sendMessage}
                disabled={isStreaming}
              >
                {isStreaming ? "..." : ">"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

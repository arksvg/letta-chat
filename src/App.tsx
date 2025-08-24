import React, { useEffect, useState } from "react";
import axios from "axios";
import { ChatBox } from "./components/ChatBox";

const API_BASE = "https://18.116.74.207:8283/v1";

interface Agent {
  id: string;
  name: string | null;
}

interface AppProps {
  splitCount: number;
}

function App({ splitCount }: AppProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (splitCount > 1) {
      setIsSidebarOpen(false);
    }
  }, [splitCount]);

  useEffect(() => {
    // Fetch agent list
    setLoadingAgents(true);
    axios
      .get(`${API_BASE}/agents`, {
        headers: { Authorization: `Bearer password` },
      })
      .then((res) => {
        setAgents(res.data);
        if (res.data.length > 0 && !selectedAgent) {
          setSelectedAgent(res.data[0].id);
        }
      })
      .catch((err) => {
        console.error("Error fetching agents:", err);
      })
      .finally(() => setLoadingAgents(false));
  }, []);

  const handleSelectAgent = (agentId: string) => {
    setLoadingChat(true);
    setSelectedAgent(agentId);
    setTimeout(() => setLoadingChat(false), 300);
  };

  const handleResetMessages = async (agentId: string) => {
    if (
      !window.confirm("Are you sure you want to reset messages for this agent?")
    )
      return;
    try {
      await axios.patch(
        `${API_BASE}/agents/${agentId}/reset-messages`,
        {},
        {
          headers: { Authorization: `Bearer password` },
        }
      );
      if (agentId === selectedAgent) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to reset messages:", err);
    }
  };

  const agent = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="flex h-screen bg-base-200 text-base-content">
      {isSidebarOpen && splitCount === 1 && (
        <div className="w-64 bg-base-300 p-4 border-r border-base-100 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Agents</h2>
            <button
              className="text-gray-700 hover:text-gray-900"
              onClick={() => setIsSidebarOpen(false)}
              title="Close Sidebar"
            >
              ✖
            </button>
          </div>

          {loadingAgents ? (
            <div className="text-center py-4 text-gray-500">
              Loading agents...
            </div>
          ) : (
            <ul className="space-y-2">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  className="flex items-center justify-between"
                >
                  <button
                    onClick={() => handleSelectAgent(agent.id)}
                    className={`flex-1 text-left truncate px-3 py-2 rounded-md transition ${
                      selectedAgent === agent.id
                        ? "bg-gray-300 text-black"
                        : "hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    {agent.name || agent.id.slice(0, 8)}
                  </button>

                  <button
                    onClick={() => handleResetMessages(agent.id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                    title="Reset Messages"
                  >
                    ⟳
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 bg-base-100 relative">
        {loadingChat ? (
          <div className="flex items-center justify-center h-full text-xl text-gray-500">
            Loading chat...
          </div>
        ) : selectedAgent ? (
          <ChatBox
            splitCount={splitCount}
            agents={agents}
            handleResetMessages={handleResetMessages}
            handleSelectAgent={handleSelectAgent}
            agentname={agent?.name}
            agentId={selectedAgent}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xl text-gray-500">
            {splitCount > 1
              ? "Loading chat..."
              : "Select an agent to start chatting"}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import { useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";

function LiveClassRoom({ courseId, token, userRole }) {
  const [roomInfo, setRoomInfo] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function joinLiveClass() {
    setStatus("Getting access to the live class...");
    setError("");

    try {
      const response = await fetch(`/api/live-classes/${courseId}/token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not join the live class");
      }

      setRoomInfo(data);
      setStatus("");
    } catch (joinError) {
      setStatus("");
      setError(joinError.message);
    }
  }

  if (!token) {
    return <p>Sign in to join the live class.</p>;
  }

  return (
    <section>
      <h3>Live class</h3>

      {!roomInfo ? (
        <button type="button" onClick={joinLiveClass}>
          Join live class
        </button>
      ) : (
        <LiveKitRoom
          token={roomInfo.token}
          serverUrl={roomInfo.serverUrl}
          connect={true}
         video={userRole === "instructor"}
         audio={userRole === "instructor"}
          onError={(roomError) => setError(roomError.message)}
          onDisconnected={() => setRoomInfo(null)}
          style={{ height: "70vh" }}
        >
          <VideoConference />
        </LiveKitRoom>
      )}

      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export default LiveClassRoom;
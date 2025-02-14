// NotificationListener.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const POLL_INTERVAL = 5000; // Poll interval if continuous polling is desired

// Custom close button that, when clicked, marks the notification (by requestId)
// as dismissed (stored in localStorage) and then closes the toast.
const CustomCloseButton = ({ closeToast, requestId, onDismiss }) => {
  const handleClick = () => {
    onDismiss(requestId);
    closeToast();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "30px",
        lineHeight: "1",
      }}
    >
      &times;
    </button>
  );
};

const NotificationListener = () => {
  const [notifiedRequests, setNotifiedRequests] = useState(new Set());
  // Load dismissed request IDs from localStorage when the component mounts.
  const [dismissedRequests, setDismissedRequests] = useState(() => {
    const stored = localStorage.getItem("dismissedTransferNotifications");
    return new Set(stored ? JSON.parse(stored) : []);
  });
  const loggedInUser = JSON.parse(sessionStorage.getItem("user"));

  // When a notification is dismissed, add its ID to dismissedRequests and update localStorage.
  const handleDismiss = useCallback((requestId) => {
    setDismissedRequests((prev) => {
      const updated = new Set(prev);
      updated.add(requestId);
      localStorage.setItem("dismissedTransferNotifications", JSON.stringify(Array.from(updated)));
      return updated;
    });
  }, []);

  // Function to poll requests (or call it on-demand)
  const pollRequests = async () => {
    if (!loggedInUser) return;
    try {
      // Use an endpoint that returns all transfer requests (including approved/rejected)
      const response = await axios.get(
        "https://muditamleads-14f32a10d7f7.herokuapp.com/api/leads/transfer-requests/all"
      );
      const requests = response.data || [];

      // For Manager: show new pending transfer requests
      if (loggedInUser.role === "Manager") {
        requests.forEach((req) => {
          if (
            req.status === "pending" &&
            !notifiedRequests.has(req._id) &&
            !dismissedRequests.has(req._id)
          ) {
            toast.info(`You have a new lead request by ${req.requestedBy}.`, {
              position: "bottom-right",
              toastId: req._id,
              closeButton: ({ closeToast }) => (
                <CustomCloseButton
                  closeToast={closeToast}
                  requestId={req._id}
                  onDismiss={handleDismiss}
                />
              ),
            });
            setNotifiedRequests((prev) => new Set(prev).add(req._id));
          }
        });
      }

      // For Sales/Retention Agents: show approved/rejected transfer requests
      if (loggedInUser.role === "Sales Agent" || loggedInUser.role === "Retention Agent") {
        requests.forEach((req) => {
          if (
            req.requestedBy === loggedInUser.fullName &&
            !notifiedRequests.has(req._id) &&
            !dismissedRequests.has(req._id)
          ) {
            if (req.status === "approved") {
              toast.success("Your transfer request is accepted.", {
                position: "bottom-right",
                toastId: req._id,
                closeButton: ({ closeToast }) => (
                  <CustomCloseButton
                    closeToast={closeToast}
                    requestId={req._id}
                    onDismiss={handleDismiss}
                  />
                ),
              });
              setNotifiedRequests((prev) => new Set(prev).add(req._id));
            } else if (req.status === "rejected") {
              toast.error("Your transfer request is rejected.", {
                position: "bottom-right",
                toastId: req._id,
                closeButton: ({ closeToast }) => (
                  <CustomCloseButton
                    closeToast={closeToast}
                    requestId={req._id}
                    onDismiss={handleDismiss}
                  />
                ),
              });
              setNotifiedRequests((prev) => new Set(prev).add(req._id));
            }
          }
        });
      }
    } catch (error) {
      console.error("Error polling transfer requests:", error);
    }
  };

  // Instead of continuous polling, you can call pollRequests only when needed.
  // For example, to fetch notifications on component mount:
  useEffect(() => {
    pollRequests();
  }, [loggedInUser, notifiedRequests, dismissedRequests, handleDismiss]);

  // If you want continuous polling, uncomment the following useEffect and comment out the one above:
  /*
  useEffect(() => {
    if (!loggedInUser) return;
    const intervalId = setInterval(pollRequests, POLL_INTERVAL);
    pollRequests(); // initial poll
    return () => clearInterval(intervalId);
  }, [loggedInUser, notifiedRequests, dismissedRequests, handleDismiss]);
  */

  return null; // This component does not render any UI
};

export default NotificationListener;

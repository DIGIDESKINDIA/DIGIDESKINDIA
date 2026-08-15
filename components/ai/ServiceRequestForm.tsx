"use client";

import { useState } from "react";

type Props = {
  service: string;
};

export default function ServiceRequestForm({
  service,
}: Props) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendWhatsApp = async () => {
    if (!name.trim() || !mobile.trim()) {
      alert("Please enter Name and Mobile Number");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mobile,
          service,
          message,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      const text = `
*New Service Request*

Name: ${name}
Mobile: ${mobile}
Service: ${service}

Message:
${message}
`;

      const whatsappUrl =
        `https://wa.me/919696295457?text=${encodeURIComponent(text)}`;

      window.open(whatsappUrl, "_blank");

      alert("Request submitted successfully!");

      setName("");
      setMobile("");
      setMessage("");
    } catch (error) {
      console.error(error);

      alert("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      <input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border p-3 rounded-xl"
      />

      <input
        type="tel"
        placeholder="Mobile Number"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        className="w-full border p-3 rounded-xl"
      />

      <textarea
        placeholder="Write your requirement..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full border p-3 rounded-xl h-28"
      />

      <button
        onClick={sendWhatsApp}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Send on WhatsApp"}
      </button>

    </div>
  );
}
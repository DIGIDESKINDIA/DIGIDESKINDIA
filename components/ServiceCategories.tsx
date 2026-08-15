const categories = [
  {
    title: "Government Services",
    description: "PAN, Aadhaar, Voter ID, Certificates",
    icon: "🏛️",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "PDF Tools",
    description: "Merge, Split, Compress, Convert",
    icon: "📄",
    color: "from-red-500 to-pink-600",
  },
  {
    title: "Image Tools",
    description: "Background Remove, Passport Photo",
    icon: "🖼️",
    color: "from-green-500 to-emerald-600",
  },
  {
    title: "AI Tools",
    description: "AI Chat, AI Assistant, OCR",
    icon: "🤖",
    color: "from-purple-500 to-violet-600",
  },
  {
    title: "Bill Payments",
    description: "Electricity, Water, Gas, Mobile",
    icon: "💳",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Travel Booking",
    description: "Train, Bus, Flight, Hotel",
    icon: "✈️",
    color: "from-cyan-500 to-blue-500",
  },
];

export default function ServiceCategories() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-100">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold">
            Explore Digital Desk
          </h2>

          <p className="text-gray-500 mt-3">
            Everything you need in one platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {categories.map((item) => (

            <div
              key={item.title}
              className="rounded-3xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition duration-300 hover:-translate-y-2"
            >

              <div
                className={`bg-gradient-to-r ${item.color} text-white p-8`}
              >
                <div className="text-6xl">
                  {item.icon}
                </div>

                <h3 className="text-2xl font-bold mt-5">
                  {item.title}
                </h3>

                <p className="mt-3 opacity-90">
                  {item.description}
                </p>
              </div>

              <div className="p-6">

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl">
                  Explore
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}
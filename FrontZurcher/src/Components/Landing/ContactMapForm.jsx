import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaMapMarkerAlt } from "react-icons/fa";
import { sendContact } from "../../Redux/Actions/contactActions";

const initialState = {
  name: "",
  email: "",
  phone: "",
  message: "",
  files: [],
};


const ContactMapForm = () => {
  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fileList, setFileList] = useState([]); // [{name, file, id}]
  const dispatch = useDispatch();
  const contactState = useSelector((state) => state.contact);

  // Helper to generate unique ids for files
  const generateFileId = (file) => `${file.name}_${file.size}_${file.lastModified}`;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "files") {
      // Accumulate files, avoid duplicates
      let newFiles = Array.from(files);
      setFileList((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        const filtered = newFiles.filter((file) => !existingIds.has(generateFileId(file)));
        return [
          ...prev,
          ...filtered.map((file) => ({ file, name: file.name, id: generateFileId(file) })),
        ];
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Remove file from list
  const handleRemoveFile = (id) => {
    setFileList((prev) => prev.filter((f) => f.id !== id));
  };

  // On submit, build FormData with files from fileList
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("message", form.message);
    if (fileList.length > 0) {
      fileList.forEach(({ file }) => formData.append("attachments", file));
    }
    try {
      await dispatch(sendContact(formData));
      setSubmitted(true);
      setForm(initialState);
      setFileList([]);
    } catch (err) {
      setError("There was an error sending your request. Please try again later.");
    }
  };

  return (
    <section className="w-full bg-slate-50 py-12 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch justify-center">
          {/* AREAS + MAPA */}
          <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col min-h-[350px] border border-slate-100 w-full h-full md:h-auto">
            <h2 className="text-3xl font-bold text-blue-900 mb-2 tracking-tight text-center">Service Areas</h2>
            <div className="w-12 h-1 bg-blue-200 rounded-full mb-6 mx-auto"></div>
            <div className="rounded-lg overflow-hidden shadow border border-slate-200 w-full h-56 bg-slate-100 flex flex-col mb-4">
              <iframe
                title="Zurcher Septic Location"
                src="https://www.google.com/maps?q=450+Rathburn,+lehigh+acres&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '180px', minWidth: '100%' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              ></iframe>
            </div>
            <div className="text-slate-600 text-sm text-center mb-4">
              <span className="font-semibold">Address:</span> 450 Rathburn, Lehigh Acres, FL<br />
              <span className="text-xs text-slate-400">Serving all Central, Southwest & South-Central Florida</span>
            </div>
            <div className="w-full">
              <AccordionArea
                title="Southwest Florida"
                defaultOpen={false}
                areas={["Fort Myers","Cape Coral","Naples","Bonita Springs","Estero","Lehigh Acres","Immokalee","Marco Island","Sanibel","Punta Gorda","Port Charlotte","North Fort Myers","Golden Gate"]}
              />
              <AccordionArea
                title="South-Central Florida"
                defaultOpen={false}
                areas={["Sebring","Lake Placid"]}
              />
              <AccordionArea
                title="Central Florida"
                defaultOpen={false}
                areas={["Poinciana","Deltona","Davenport","Orlando","Apopka","Kissimmee","Conway","Lake County","Orange County","Osceola County","Seminole County"]}
              />
            </div>
            <div className="mt-6 text-xs text-slate-500 text-center">
              Don’t see your city on the list?<br />
              <span className="text-blue-600 font-medium">Contact us to confirm if we serve your area — we’ll be happy to assist you!</span>
            </div>
          </div>
          {/* FORMULARIO */}
          <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col justify-center min-h-[350px] border border-slate-100 w-full max-w-2xl mx-auto h-full md:h-auto">
            <form className="flex flex-col gap-4 h-full" onSubmit={handleSubmit}>
              <h4 className="text-3xl font-bold text-blue-900 mb-2 tracking-tight text-center">Request a Quote</h4>
              {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
              {submitted ? (
                <div className="text-green-600 text-sm">Thank you! We will contact you soon.</div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-xs font-medium">Name*</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="rounded px-3 py-2 bg-slate-100 text-blue-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-xs font-medium">Phone*</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="rounded px-3 py-2 bg-slate-100 text-blue-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-xs font-medium">Email*</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="rounded px-3 py-2 bg-slate-100 text-blue-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-xs font-medium">Attach Permit/Document</label>
                    <input
                      type="file"
                      name="files"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleChange}
                      className="rounded px-3 py-2 bg-slate-100 text-blue-900 border border-slate-200 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white"
                      multiple
                    />
                    <span className="text-xs text-slate-500 mt-1 italic">If you don’t have the permit yet, no worries — just send us your information and we’ll guide you through the process.</span>
                    {/* File list with remove option */}
                    {fileList.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {fileList.map((f) => (
                          <li key={f.id} className="flex items-center justify-between bg-slate-100 rounded px-2 py-1 text-blue-900 text-xs border border-slate-200">
                            <span className="truncate max-w-[180px]" title={f.name}>{f.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(f.id)}
                              className="ml-2 text-red-500 hover:text-red-700 px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-red-300"
                              aria-label={`Remove ${f.name}`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                   
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={3}
                      className="rounded px-3 py-2 bg-slate-100 text-blue-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[80px]"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition-all duration-300 shadow-lg"
                  >
                    Send Request
                  </button>
                  {contactState.loading && <div className="text-blue-600 text-xs mb-2">Sending...</div>}
                  {contactState.error && <div className="text-red-500 text-xs mb-2">{contactState.error}</div>}
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactMapForm;

// Accordion for area regions
const AccordionArea = ({ title, areas, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        type="button"
        className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-900 font-semibold text-base mb-1 transition-all"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg className={`w-5 h-5 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <ul className="pl-2 py-1 grid grid-cols-1 gap-1">
          {areas.map((area) => (
            <li key={area}>
              <ServiceAreaItem name={area} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ServiceAreaItem component for icon + name
const ServiceAreaItem = ({ name }) => {
  return (
    <div className="flex items-center gap-2">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
        <path d="M10 2C6.686 2 4 4.686 4 8c0 4.418 5.09 9.36 5.312 9.58a1 1 0 0 0 1.376 0C10.91 17.36 16 12.418 16 8c0-3.314-2.686-6-6-6zm0 11a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill="#2563eb"/>
        <circle cx="10" cy="8" r="2.2" fill="#2563eb"/>
      </svg>
      <span className="text-blue-800 font-medium text-[15px]">{name}</span>
    </div>
  );
};

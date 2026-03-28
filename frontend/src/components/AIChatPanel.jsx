import "katex/dist/katex.min.css";
import { Bot, Mic, Paperclip, Send, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "./AIChatPanel.css";

const API_URL = "http://localhost:8000";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function TypewriterMessage({ text, audioDuration, isSpeaking, onFinished }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!isSpeaking) {
      setDisplayedText(text);
      return;
    }
    let i = 0;
    const speed =
      audioDuration > 0 ? (audioDuration * 1000) / (text.length * 1.2) : 30;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        onFinished();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, audioDuration, isSpeaking, onFinished]);

  return (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {displayedText}
    </ReactMarkdown>
  );
}

/**
 * Reusable AI Chat Panel.
 *
 * @param {object}  props
 * @param {string}  props.mode               - "course" | "exercise" | "mock_exam" | "general"
 * @param {string}  [props.level]            - e.g. "6eme_annee_primaire"
 * @param {string}  [props.subject]          - e.g. "Mathematiques"
 * @param {string}  [props.chapter]          - e.g. "Nombres relatifs"
 * @param {string}  [props.referencePdfPath] - path to the course PDF (under /pdfs/...)
 * @param {string}  [props.exercisePdfPath]  - path to the exercise PDF
 * @param {function}[props.onClose]          - callback to close the panel
 * @param {boolean} [props.fullWidth]        - if true, the panel takes full width (ProfAI page)
 */
export default function AIChatPanel({
  mode = "general",
  level = "",
  subject = "",
  chapter = "",
  referencePdfPath = "",
  exercisePdfPath = "",
  onClose,
  fullWidth = false,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [currentAudioDuration, setCurrentAudioDuration] = useState(0);
  const [showTranscriptConfirm, setShowTranscriptConfirm] = useState(false);
  const [confirmedTranscript, setConfirmedTranscript] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [referenceSent, setReferenceSent] = useState(false);

  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const recognitionRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const transcriptRef = useRef("");
  const chatEndRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, inputText, isAiSpeaking]);

  // Set up speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "fr-FR";

      recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal)
            finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        const currentText = finalTranscript + interimTranscript;
        setInputText(currentText);
        transcriptRef.current = currentText;
      };

      recognition.onend = () => {
        setIsListening(false);
        const transcript = transcriptRef.current.trim();
        if (!transcript) {
          stopRequestedRef.current = false;
          return;
        }
        if (stopRequestedRef.current) {
          setConfirmedTranscript(transcript);
          setShowTranscriptConfirm(true);
        }
        stopRequestedRef.current = false;
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopRequestedRef.current = true;
      recognitionRef.current?.stop();
    } else {
      setInputText("");
      transcriptRef.current = "";
      setShowTranscriptConfirm(false);
      setConfirmedTranscript("");
      stopRequestedRef.current = false;
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleConfirmTranscriptSend = () => {
    const finalText = confirmedTranscript.trim();
    if (!finalText) {
      setShowTranscriptConfirm(false);
      return;
    }
    setShowTranscriptConfirm(false);
    handleSendMessage(finalText);
  };

  const handleCancelTranscript = () => {
    setShowTranscriptConfirm(false);
    setConfirmedTranscript("");
    transcriptRef.current = "";
  };

  // Audio visualizer
  const setupAudioVisualizer = () => {
    if (!audioCtxRef.current && audioRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current = audioCtxRef.current.createMediaElementSource(
        audioRef.current,
      );
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current?.state === "suspended")
      audioCtxRef.current.resume();
  };

  const updateVolume = () => {
    if (!analyserRef.current || !isAiSpeaking) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    setVolume(sum / dataArray.length);
    requestAnimationFrame(updateVolume);
  };

  useEffect(() => {
    if (isAiSpeaking) updateVolume();
  }, [isAiSpeaking]);

  // Drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSubmit) => {
    if (!textToSubmit.trim() && !selectedFile) return;

    const currentFile = selectedFile;
    setMessages((prev) => prev.map((m) => ({ ...m, isNew: false })));
    setMessages((prev) => [
      ...prev,
      { role: "user", text: textToSubmit, attachment: currentFile?.name },
    ]);
    setInputText("");
    setSelectedFile(null);
    transcriptRef.current = "";
    setIsAiSpeaking(true);

    try {
      const formData = new FormData();
      formData.append("message", textToSubmit || "Can you help me with this?");
      formData.append("voice", isVoiceEnabled.toString());
      formData.append("language", "fr-FR");
      formData.append("mode", mode);
      formData.append("level", level);
      formData.append("subject", subject);
      formData.append("chapter", chapter);

      if (sessionId) {
        formData.append("session_id", sessionId);
      }

      // Attach reference PDF on first message only
      if (!referenceSent && referencePdfPath) {
        try {
          const pdfResponse = await fetch(referencePdfPath);
          if (pdfResponse.ok) {
            const pdfBlob = await pdfResponse.blob();
            const pdfName = referencePdfPath.split("/").pop() || "course.pdf";
            formData.append("reference_pdf", pdfBlob, pdfName);
          }
        } catch (err) {
          console.warn("Could not attach reference PDF:", err);
        }
      }

      // Also attach exercise PDF on first message if in exercise mode
      if (!referenceSent && exercisePdfPath) {
        try {
          const exPdfResponse = await fetch(exercisePdfPath);
          if (exPdfResponse.ok) {
            const exPdfBlob = await exPdfResponse.blob();
            const exPdfName =
              exercisePdfPath.split("/").pop() || "exercice.pdf";
            // Send as a regular file upload
            formData.append("file", exPdfBlob, exPdfName);
          }
        } catch (err) {
          console.warn("Could not attach exercise PDF:", err);
        }
      }

      // Attach user-selected file
      if (currentFile) {
        formData.append("file", currentFile);
      }

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Store session ID from first response
      if (data.session_id) {
        setSessionId(data.session_id);
      }
      if (!referenceSent) {
        setReferenceSent(true);
      }

      if (data.audio && audioRef.current) {
        setupAudioVisualizer();
        audioRef.current.src = `data:audio/mp3;base64,${data.audio}`;
        audioRef.current.load();

        audioRef.current.oncanplaythrough = () => {
          const duration = audioRef.current.duration;
          setCurrentAudioDuration(duration === Infinity ? 3 : duration);
          audioRef.current
            .play()
            .catch((e) => console.error("Autoplay blocked:", e));
          setMessages((prev) => [
            ...prev,
            { role: "ai", text: data.text, isNew: true },
          ]);
          audioRef.current.oncanplaythrough = null;
        };

        audioRef.current.onended = () => {
          setIsAiSpeaking(false);
          setVolume(0);
        };
      } else {
        setIsAiSpeaking(false);
        setVolume(0);
        setCurrentAudioDuration(0);
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: data.text, isNew: true },
        ]);
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
      setIsAiSpeaking(false);
      setVolume(0);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          isNew: true,
        },
      ]);
    }
  };

  const modeLabels = {
    course: "Course Tutor",
    exercise: "Exercise Corrector",
    mock_exam: "Exam Generator",
    general: "Prof IA",
  };

  return (
    <div
      className={`aichat-panel ${fullWidth ? "aichat-full" : ""} ${isDragging ? "aichat-drag-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="aichat-drag-overlay">
          <p>Drop your file here</p>
        </div>
      )}

      {/* Header */}
      <header className="aichat-header">
        <div className="aichat-header-left">
          <div
            className={`aichat-blob ${isAiSpeaking ? "active" : ""}`}
            style={{ transform: `scale(${1 + volume / 700})` }}
          />
          <span className="aichat-title">
            <Bot size={16} />
            {modeLabels[mode] || "AI Assistant"}
          </span>
        </div>
        <div className="aichat-header-right">
          <button
            className={`aichat-voice-toggle ${isVoiceEnabled ? "active" : ""}`}
            onClick={() => setIsVoiceEnabled((v) => !v)}
            title={isVoiceEnabled ? "Disable voice" : "Enable voice"}
          >
            {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {onClose && (
            <button className="aichat-close-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="aichat-messages">
        {!messages.length && (
          <div className="aichat-empty">
            <Bot size={32} className="aichat-empty-icon" />
            <h3>
              {mode === "course" && "Ask me anything about this lesson"}
              {mode === "exercise" && "Submit your work — I'll guide you"}
              {mode === "mock_exam" && "I'll generate practice exams for you"}
              {mode === "general" && "What would you like to learn today?"}
            </h3>
            <p>
              {mode === "course" &&
                "I have access to your course PDF. Ask questions, request explanations, or explore concepts."}
              {mode === "exercise" &&
                "Share your answers and I'll correct them, grade your work, and guide you step-by-step."}
              {mode === "mock_exam" &&
                "Tell me which topics to cover and I'll create realistic exam questions with a grading rubric."}
              {mode === "general" &&
                "I can help with any subject. Upload homework, ask questions, or explore new topics."}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`aichat-row ${msg.role}`}>
            <div className={`aichat-bubble ${msg.role}`}>
              {msg.attachment && (
                <div className="aichat-attachment">📎 {msg.attachment}</div>
              )}
              {msg.role === "ai" && msg.isNew ? (
                <TypewriterMessage
                  text={msg.text}
                  audioDuration={currentAudioDuration}
                  isSpeaking={isAiSpeaking}
                  onFinished={() => {}}
                />
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.text}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {isListening && inputText && (
          <div className="aichat-row user">
            <div className="aichat-bubble user interim">{inputText}</div>
          </div>
        )}

        {isAiSpeaking && messages[messages.length - 1]?.role === "user" && (
          <div className="aichat-row ai">
            <div className="aichat-bubble ai thinking">● ● ●</div>
          </div>
        )}
        <div ref={chatEndRef} style={{ height: "1px" }} />
      </div>

      {/* Input area */}
      <div className="aichat-input-area">
        {selectedFile && (
          <div className="aichat-file-pill">
            <span>📎 {selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)}>✕</button>
          </div>
        )}

        <div className="aichat-input-row">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            className="aichat-btn attach"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>

          <button
            className={`aichat-btn mic ${isListening ? "listening" : ""}`}
            onClick={toggleListening}
            title="Microphone"
          >
            <Mic size={16} />
          </button>

          <input
            type="text"
            className="aichat-text-input"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              transcriptRef.current = e.target.value;
            }}
            placeholder={
              mode === "exercise"
                ? "Type your answer or ask a question..."
                : "Ask a question..."
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage(inputText);
            }}
          />

          <button
            className="aichat-btn send"
            onClick={() => handleSendMessage(inputText)}
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Transcript confirmation modal */}
      {showTranscriptConfirm && (
        <div className="aichat-confirm-overlay">
          <div className="aichat-confirm-modal">
            <h3>Confirm voice message</h3>
            <p>Review the transcribed text before sending.</p>
            <textarea
              value={confirmedTranscript}
              onChange={(e) => {
                setConfirmedTranscript(e.target.value);
                setInputText(e.target.value);
                transcriptRef.current = e.target.value;
              }}
              rows={4}
            />
            <div className="aichat-confirm-actions">
              <button className="ghost" onClick={handleCancelTranscript}>
                Cancel
              </button>
              <button className="primary" onClick={handleConfirmTranscriptSend}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} crossOrigin="anonymous" />
    </div>
  );
}

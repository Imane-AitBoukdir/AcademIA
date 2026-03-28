import "katex/dist/katex.min.css";
import { Mic, Paperclip, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "./App.css";

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const TypewriterMessage = ({ text, audioDuration, isSpeaking, onFinished }: { text: string, audioDuration: number, isSpeaking: boolean, onFinished: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!isSpeaking) {
      setDisplayedText(text);
      return;
    }

    let i = 0;
    const speed = audioDuration > 0 ? (audioDuration * 1000) / (text.length * 1.2) : 30;
    
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        onFinished();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, audioDuration, isSpeaking]);

  return (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {displayedText}
    </ReactMarkdown>
  );
};

export default function App() {
  const [messages, setMessages] = useState<{ role: string; text: string; isNew?: boolean, attachment?: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [language, setLanguage] = useState("fr-FR");
  
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [currentAudioDuration, setCurrentAudioDuration] = useState(0);
  const [showTranscriptConfirm, setShowTranscriptConfirm] = useState(false);
  const [confirmedTranscript, setConfirmedTranscript] = useState("");

  // --- NEW: File Upload State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const stopRequestedRef = useRef(false);
  const transcriptRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, inputText, isAiSpeaking]);

  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
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
  }, [language]);

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

  const normalizeTranscript = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

  const isTranscriptEquivalent = normalizeTranscript(confirmedTranscript) === normalizeTranscript(inputText);

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

  const setupAudioVisualizer = () => {
    if (!audioCtxRef.current && audioRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
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

  // --- NEW: Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = async (textToSubmit: string) => {
    // Prevent sending empty messages unless there's a file attached
    if (!textToSubmit.trim() && !selectedFile) return;

    const currentFile = selectedFile; // Capture current state
    
    setMessages((prev) => prev.map(m => ({ ...m, isNew: false })));
    setMessages((prev) => [...prev, { 
      role: "user", 
      text: textToSubmit, 
      attachment: currentFile?.name 
    }]);
    
    setInputText("");
    setSelectedFile(null); // Clear file immediately after sending
    transcriptRef.current = ""; 
    setIsAiSpeaking(true); 

    try {
      const conversationHistory = messages
        .filter((m) => m.text?.trim())
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          text: m.text,
        }));

      // --- NEW: Using FormData instead of JSON ---
      const formData = new FormData();
      formData.append("message", textToSubmit || "Pouvez-vous m'expliquer ce document ?"); // Default text if only file sent
      formData.append("voice", isVoiceMode.toString());
      formData.append("language", language);
      formData.append("history", JSON.stringify(conversationHistory));
      if (currentFile) {
        formData.append("file", currentFile);
      }

      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        body: formData, // No Content-Type header needed, browser handles boundary
      });

      const data = await response.json();

      if (data.audio && audioRef.current) {
        setupAudioVisualizer();
        audioRef.current.src = `data:audio/mp3;base64,${data.audio}`;
        audioRef.current.load();
        
        audioRef.current.oncanplaythrough = () => {
          const duration = audioRef.current!.duration;
          setCurrentAudioDuration(duration === Infinity ? 3 : duration);
          audioRef.current!.play().catch(e => console.error("Autoplay blocked:", e));
          setMessages((prev) => [...prev, { role: "ai", text: data.text, isNew: true }]);
          audioRef.current!.oncanplaythrough = null; 
        };
        
        audioRef.current.onended = () => {
          setIsAiSpeaking(false);
          setVolume(0);
        };
      } else {
        setIsAiSpeaking(false);
        setVolume(0);
        setCurrentAudioDuration(0);
        setMessages((prev) => [...prev, { role: "ai", text: data.text, isNew: true }]);
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
      setIsAiSpeaking(false);
      setVolume(0);
    }
  };

  return (
    <div 
      className={`app-container ${isDragging ? "drag-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <h2>Déposez votre fichier ici</h2>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <div className={`voice-blob header-voice ${isAiSpeaking ? "active" : ""}`} style={{ transform: `scale(${1 + volume / 700})` }} />
          <h1>AI Assistant</h1>
        </div>
        <div className="toggles">
          <label className="toggle-chip">
            <input type="checkbox" checked={isVoiceMode} onChange={(e) => setIsVoiceMode(e.target.checked)} />
            <span>Voice</span>
          </label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="fr-FR">Français</option>
            <option value="ar-SA">العربية</option>
          </select>
        </div>
      </header>

      <main className="main-content">
        <div className="chat-container">
          <div className="chat-history">
            {!messages.length && (
              <div className="conversation-empty-state">
                <h2>Comment puis-je vous aider aujourd'hui ?</h2>
                <p>Posez une question, utilisez le micro, ou ajoutez un fichier pour démarrer.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className={`message-bubble ${msg.role}`}>
                  {/* Show attachment indicator if user uploaded a file */}
                  {msg.attachment && (
                    <div className="attachment-indicator">
                      📎 {msg.attachment}
                    </div>
                  )}
                  {msg.role === "ai" && msg.isNew ? (
                     <TypewriterMessage 
                        text={msg.text} 
                        audioDuration={currentAudioDuration} 
                        isSpeaking={isAiSpeaking} 
                        onFinished={() => {}} 
                     />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            
            {isListening && inputText && (
              <div className="message-row user">
                <div className="message-bubble user interim">{inputText}</div>
              </div>
            )}
            
            {(isAiSpeaking && messages[messages.length - 1]?.role === "user") && (
              <div className="message-row ai">
                <div className="message-bubble ai thinking">● ● ●</div>
              </div>
            )}
            <div ref={chatEndRef} style={{ height: "1px" }} />
          </div>
        </div>
      </main>

      <div className="input-area-wrapper">
        <div className="input-container-vertical">
          
          {/* File Preview Pill */}
          {selectedFile && (
            <div className="file-preview-pill">
              📎 {selectedFile.name}
              <button onClick={() => setSelectedFile(null)}>✕</button>
            </div>
          )}

          <div className="input-box">
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={handleFileChange} 
              accept="image/*,.pdf,.doc,.docx"
            />
            <button 
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un fichier"
            >
              <Paperclip size={18} />
            </button>
            
            <button 
              className={`mic-button ${isListening ? "listening" : ""}`} 
              onClick={toggleListening}
              title="Microphone"
            >
              <Mic size={18} />
            </button>

            <input 
              type="text" 
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                transcriptRef.current = e.target.value;
              }}
              placeholder="Posez une question ou glissez un exercice..."
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(inputText); }}
            />

            <button 
              className="send-button"
              onClick={() => handleSendMessage(inputText)}
              title="Envoyer"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {showTranscriptConfirm && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmer le texte dicté">
          <div className="confirm-modal">
            <h3>Confirmer le message vocal</h3>
            <p>
              {isTranscriptEquivalent
                ? "Le texte reconnu correspond bien au contenu affiché."
                : "Le texte reconnu semble différent du contenu affiché. Vérifiez avant l'envoi."}
            </p>

            <textarea
              value={confirmedTranscript}
              onChange={(e) => {
                setConfirmedTranscript(e.target.value);
                setInputText(e.target.value);
                transcriptRef.current = e.target.value;
              }}
              rows={4}
            />

            <div className="confirm-actions">
              <button type="button" className="ghost" onClick={handleCancelTranscript}>Annuler</button>
              <button type="button" className="primary" onClick={handleConfirmTranscriptSend}>Envoyer</button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} crossOrigin="anonymous" />
    </div>
  );
}
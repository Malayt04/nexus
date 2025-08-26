import React, { useState, useEffect, useRef } from 'react';
import { saveDebugAudio } from '../utils/audio-debug-util';

const MeetingAssistantPage: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [meetingContext, setMeetingContext] = useState('');
  const [transcript, setTranscript] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);

  const SAMPLE_RATE = 24000;
  const AUDIO_CHUNK_DURATION = 0.1; // seconds
  const BUFFER_SIZE = 4096;

  useEffect(() => {
    const handleCoachResponse = (_, response: string) => {
      setSuggestions(response);
    };

    const handleCoachResponseError = (_, error: string) => {
      console.error('Coach Error:', error);
    };

    window.electronAPI.onCoachResponse(handleCoachResponse);
    window.electronAPI.onCoachResponseError(handleCoachResponseError);

    return () => {
      // Clean up listeners when the component unmounts
      window.electronAPI.onCoachResponse(handleCoachResponse);
      window.electronAPI.onCoachResponseError(handleCoachResponseError);
    };
  }, []);

  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const startAudioProcessing = (stream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
    audioProcessorRef.current = processor;

    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    processor.onaudioprocess = async (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      audioBufferRef.current.push(new Float32Array(inputData));

      let totalSamples = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);

      while (totalSamples >= samplesPerChunk) {
        const chunk = new Float32Array(samplesPerChunk);
        let offset = 0;
        while(offset < samplesPerChunk) {
            const buffer = audioBufferRef.current[0];
            const toCopy = Math.min(buffer.length, samplesPerChunk - offset);
            chunk.set(buffer.subarray(0, toCopy), offset);
            if (toCopy < buffer.length) {
                audioBufferRef.current[0] = buffer.subarray(toCopy);
            } else {
                audioBufferRef.current.shift();
            }
            offset += toCopy;
        }

        const pcmData16 = convertFloat32ToInt16(chunk);
        // This is where you would send the audio to the main process for transcription
        // For now, we'll just log it.
        // const base64Data = arrayBufferToBase64(pcmData16.buffer);
        // await window.electronAPI.sendAudioForTranscription(base64Data);
        
        // For demonstration, we'll just add a placeholder to the transcript
        setTranscript(prev => prev + ".");

        totalSamples = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const handleToggleListening = async () => {
    if (isListening) {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      setIsListening(false);
    } else {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: SAMPLE_RATE,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });
        mediaStreamRef.current = stream;
        startAudioProcessing(stream);
        setIsListening(true);
    }
  };

  const handleSaveDebugAudio = () => {
    if (audioBufferRef.current.length > 0) {
        const fullBuffer = new Float32Array(audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0));
        let offset = 0;
        for (const chunk of audioBufferRef.current) {
            fullBuffer.set(chunk, offset);
            offset += chunk.length;
        }
        const pcmData16 = convertFloat32ToInt16(fullBuffer);
        saveDebugAudio(Buffer.from(pcmData16.buffer), 'meeting-audio');
    } else {
        alert("No audio captured to save.");
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Meeting Assistant</h1>
      <div className="flex flex-col space-y-4">
        <div className="flex space-x-2">
            <button
              onClick={handleToggleListening}
              className={`px-4 py-2 rounded text-white ${isListening ? 'bg-red-500' : 'bg-green-500'}`}>
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
            <button
              onClick={handleSaveDebugAudio}
              className="px-4 py-2 rounded text-white bg-gray-600 hover:bg-gray-700">
              Save Debug Audio
            </button>
        </div>
        <input
          type="text"
          value={meetingContext}
          onChange={(e) => setMeetingContext(e.target.value)}
          placeholder="Enter meeting context..."
          className="p-2 border rounded"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-xl font-semibold">Live Transcript</h2>
            <div className="p-2 border rounded h-64 overflow-y-auto">{
              transcript
            }</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI Suggestions</h2>
            <div className="p-2 border rounded h-64 overflow-y-auto">{suggestions}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingAssistantPage;
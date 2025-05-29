import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const uploadImgRef = useRef();
  const capturedImgRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();

  const [uploadImg, setUploadImg] = useState(null);
  const [capturedImg, setCapturedImg] = useState(null);
  const [result, setResult] = useState('');
  const [ready, setReady] = useState({ upload: false, capture: false });

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    };
    loadModels();
  }, []);

  // Start webcam
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(console.error);
  }, []);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedImg(url);
      setReady(prev => ({ ...prev, capture: false })); // Reset before new image loads
    }, 'image/jpeg');
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadImg(url);
      setReady(prev => ({ ...prev, upload: false })); // Reset before new image loads
    }
  };

  const compareFaces = async () => {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

    const [uploadDetection, capturedDetection] = await Promise.all([
      faceapi.detectSingleFace(uploadImgRef.current, options).withFaceLandmarks().withFaceDescriptor(),
      faceapi.detectSingleFace(capturedImgRef.current, options).withFaceLandmarks().withFaceDescriptor(),
    ]);

    if (uploadDetection && capturedDetection) {
      const distance = faceapi.euclideanDistance(
        uploadDetection.descriptor,
        capturedDetection.descriptor
      );
      if (distance < 0.6) {
        setResult(`✅ Match! (Distance: ${distance.toFixed(2)})`);
      } else {
        setResult(`❌ No Match. (Distance: ${distance.toFixed(2)})`);
      }
    } else {
      setResult("⚠️ Unable to detect face in one or both images.");
    }
  };

  // Trigger comparison when both images are ready
  useEffect(() => {
    if (ready.upload && ready.capture) {
      compareFaces();
    }
  }, [ready]);

  return (
    <div className="App">
      <h2>Upload Image</h2>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {uploadImg && (
        <img
          ref={uploadImgRef}
          src={uploadImg}
          alt="Uploaded"
          height="200"
          onLoad={() => setReady(prev => ({ ...prev, upload: true }))}
        />
      )}

      <h2>Capture from Camera</h2>
      <video ref={videoRef} autoPlay muted height="200" />
      <br />
      <button onClick={captureImage}>Capture</button>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {capturedImg && (
        <img
          ref={capturedImgRef}
          src={capturedImg}
          alt="Captured"
          height="200"
          onLoad={() => setReady(prev => ({ ...prev, capture: true }))}
        />
      )}

      <h3 style={{ marginTop: '20px', color: result.startsWith("✅") ? "green" : "red" }}>
        {result}
      </h3>
    </div>
  );
}

export default App;

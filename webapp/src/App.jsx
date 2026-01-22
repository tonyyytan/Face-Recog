import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000'

function App() {
  const [currentView, setCurrentView] = useState('capture') // 'capture' | 'loading' | 'results'
  const [result, setResult] = useState(null)
  const [userPhotoUrl, setUserPhotoUrl] = useState(null)
  const [facingMode, setFacingMode] = useState('user')
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (currentView === 'capture') {
      startCamera()
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [currentView, facingMode])

  useEffect(() => {
    if (result && currentView === 'results') {
      const targetPercentage = Math.round(result.confidence * 100)
      let current = 0
      const interval = setInterval(() => {
        current += 2
        if (current >= targetPercentage) {
          setAnimatedPercentage(targetPercentage)
          clearInterval(interval)
        } else {
          setAnimatedPercentage(current)
        }
      }, 20)
      return () => clearInterval(interval)
    }
  }, [result, currentView])

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Camera error:', err)
      alert('Could not access camera. Please ensure camera permissions are granted.')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    canvas.toBlob(processImage, 'image/jpeg', 0.9)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) processImage(file)
  }

  const processImage = async (blob) => {
    setCurrentView('loading')
    setUserPhotoUrl(URL.createObjectURL(blob))

    try {
      const formData = new FormData()
      formData.append('file', blob, 'photo.jpg')

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setResult(data)
      setCurrentView('results')
    } catch (err) {
      console.error('Prediction error:', err)
      alert(`Error: ${err.message}\n\nMake sure the API container is running on ${API_URL}`)
      setCurrentView('capture')
    }
  }

  const tryAgain = () => {
    setResult(null)
    setUserPhotoUrl(null)
    setAnimatedPercentage(0)
    setCurrentView('capture')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getMatchDescription = (confidence) => {
    const c = Math.round(confidence * 100)
    if (c >= 90) return "Wow! You could be their twin! 🤩"
    if (c >= 75) return "Strong resemblance! Hollywood might call! 🌟"
    if (c >= 60) return "There's definitely a similarity there! ✨"
    if (c >= 40) return "Some features match up! 👀"
    return "Our AI sees a bit of resemblance 🤔"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
            ✨ Celebrity Twin
          </h1>
          <p className="text-slate-400">Discover your Hollywood look-alike</p>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center">
          {/* Capture View */}
          {currentView === 'capture' && (
            <div className="w-full space-y-6">
              {/* Camera Container */}
              <div className="relative aspect-square max-w-md mx-auto rounded-3xl overflow-hidden bg-slate-800/50 backdrop-blur-sm shadow-2xl shadow-purple-500/20 border border-purple-500/20">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/5 h-3/4 border-3 border-dashed border-white/30 rounded-full animate-pulse-glow" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold text-lg shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    <span className="text-xl">📸</span>
                    Take Photo
                  </button>

                  <span className="text-slate-500">or</span>

                  <label className="px-6 py-4 bg-slate-800/80 border-2 border-purple-500/50 rounded-full font-semibold cursor-pointer hover:bg-purple-600/30 hover:border-purple-400 transition-all duration-300 flex items-center gap-2">
                    <span className="text-xl">📁</span>
                    Upload
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                  className="text-slate-400 hover:text-purple-400 transition-colors text-sm"
                >
                  🔄 Switch Camera
                </button>
              </div>
            </div>
          )}

          {/* Loading View */}
          {currentView === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin-slow" />
              <p className="text-slate-400 text-lg">Finding your celebrity twin...</p>
            </div>
          )}

          {/* Results View */}
          {currentView === 'results' && result && (
            <div className="w-full animate-fade-in-up">
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-purple-500/20">
                {/* Comparison */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={userPhotoUrl}
                      alt="You"
                      className="w-24 h-24 rounded-full object-cover border-3 border-purple-500 shadow-lg shadow-purple-500/30"
                    />
                    <span className="text-sm text-slate-400 font-medium">You</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {animatedPercentage}%
                    </span>
                    <span className="text-sm text-slate-400">match!</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-3 border-pink-500 shadow-lg shadow-pink-500/30 flex items-center justify-center">
                      <span className="text-4xl">🌟</span>
                    </div>
                    <span className="text-sm text-slate-400 font-medium">{result.predicted_celebrity}</span>
                  </div>
                </div>

                {/* Result Text */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">
                    {result.face_detected
                      ? `You look like ${result.predicted_celebrity}! 🎬`
                      : `Best guess: ${result.predicted_celebrity}`
                    }
                  </h2>
                  <p className="text-slate-400">
                    {result.face_detected
                      ? getMatchDescription(result.confidence)
                      : "Tip: Try again with better lighting and face the camera directly."
                    }
                  </p>
                </div>

                {/* Top Predictions */}
                <div className="space-y-3 mb-8">
                  {result.top_predictions?.map((pred, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-slate-600'}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 font-medium">{pred.celebrity}</span>
                      <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.round(pred.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-400 w-12 text-right">
                        {Math.round(pred.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Try Again Button */}
                <div className="flex justify-center">
                  <button
                    onClick={tryAgain}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    <span>🔄</span>
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-slate-500 text-sm">
          Powered by AI • Made for fun 🎉
        </footer>
      </div>
    </div>
  )
}

export default App

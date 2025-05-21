import { spawn } from "child_process"
import qrcode from "qrcode-terminal"
import { networkInterfaces } from "os"

// Get local IP address
function getLocalIpAddress() {
  const nets = networkInterfaces()
  const results = {}

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) {
          results[name] = []
        }
        results[name].push(net.address)
      }
    }
  }

  // Return the first available IP address
  for (const name of Object.keys(results)) {
    if (results[name].length > 0) {
      return results[name][0]
    }
  }

  return "localhost"
}

// Start Next.js dev server
const nextDev = spawn("next", ["dev"], { stdio: "inherit", shell: true })

// Generate QR code
const localIp = getLocalIpAddress()
const url = `http://${localIp}:3000`

console.log("\n🔍 Scan this QR code to access the app on your mobile device:")
qrcode.generate(url, { small: true })
console.log(`\n📱 Or open: ${url}\n`)

// Handle process termination
process.on("SIGINT", () => {
  nextDev.kill("SIGINT")
  process.exit(0)
})

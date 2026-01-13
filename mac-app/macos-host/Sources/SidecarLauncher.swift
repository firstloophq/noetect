import Foundation
import Darwin

class SidecarLauncher {
    private var process: Process?
    private var port: Int = 0
    private var url: URL?

    var serverURL: URL? { url }

    func start(preferredPort: Int?) {
        port = preferredPort ?? Self.findAvailablePort()
        log("Launching sidecar on port", port)

        let bundle = Bundle.main
        let resources = bundle.resourceURL!

        let compiled = resources.appendingPathComponent("sidecar/sidecar")
        let script = resources.appendingPathComponent("sidecar/server.ts")
        var launchPath: String
        var arguments: [String] = []

        if FileManager.default.fileExists(atPath: compiled.path) {
            launchPath = compiled.path
        } else {
            // Fallback to bun runtime if compiled binary absent
            let bunInBundle = resources.appendingPathComponent("bin/bun").path
            let bunFromPath = "/usr/bin/env"
            if FileManager.default.fileExists(atPath: bunInBundle) {
                launchPath = bunInBundle
            } else {
                launchPath = bunFromPath
                arguments.append("bun")
            }
            arguments.append(contentsOf: ["run", script.path])
        }

        let p = Process()
        p.launchPath = launchPath
        p.arguments = arguments
        var env = ProcessInfo.processInfo.environment
        env["PORT"] = String(port)
        env["UI_DIR"] = resources.appendingPathComponent("public").path
        
        p.environment = env

        let outPipe = Pipe(); p.standardOutput = outPipe
        let errPipe = Pipe(); p.standardError = errPipe
        outPipe.fileHandleForReading.readabilityHandler = { handle in
            if let s = String(data: handle.availableData, encoding: .utf8), !s.isEmpty { log("[sidecar]", s.trimmingCharacters(in: .whitespacesAndNewlines)) }
        }
        errPipe.fileHandleForReading.readabilityHandler = { handle in
            if let s = String(data: handle.availableData, encoding: .utf8), !s.isEmpty { log("[sidecar]", s.trimmingCharacters(in: .whitespacesAndNewlines)) }
        }

        do {
            try p.run()
            process = p
            url = URL(string: "http://127.0.0.1:\(port)")
        } catch {
            log("Failed to start sidecar:", error.localizedDescription)
        }
    }

    func stop() {
        process?.terminate()
        process = nil
    }

    func waitUntilReady(timeoutSeconds: TimeInterval = 8.0, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "http://127.0.0.1:\(port)/health") else { completion(false); return }
        let deadline = Date().addingTimeInterval(timeoutSeconds)

        func poll() {
            if Date() > deadline { completion(false); return }
            var req = URLRequest(url: url)
            req.timeoutInterval = 0.5
            URLSession.shared.dataTask(with: req) { _, resp, _ in
                if let http = resp as? HTTPURLResponse, http.statusCode == 200 {
                    completion(true)
                } else {
                    DispatchQueue.global().asyncAfter(deadline: .now() + 0.25) { poll() }
                }
            }.resume()
        }
        poll()
    }

    static func findAvailablePort() -> Int {
        var addr = sockaddr_in()
        addr.sin_len = __uint8_t(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(0).bigEndian
        addr.sin_addr = in_addr(s_addr: inet_addr("127.0.0.1"))
        let fd = socket(AF_INET, SOCK_STREAM, 0)
        guard fd >= 0 else { return 17865 }
        var a = addr
        let bindResult = withUnsafePointer(to: &a) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) }
        }
        if bindResult == 0 {
            var len = socklen_t(MemoryLayout<sockaddr_in>.size)
            getsockname(fd, withUnsafeMutablePointer(to: &a) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { UnsafeMutablePointer($0) }
            }, &len)
            close(fd)
            return Int(UInt16(bigEndian: a.sin_port))
        }
        close(fd)
        return 17865
    }
}

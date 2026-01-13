import Foundation

func log(_ items: Any..., separator: String = " ", terminator: String = "\n") {
    let msg = items.map { "\($0)" }.joined(separator: separator)
    fputs("[host] \(msg)\n", stderr)
}


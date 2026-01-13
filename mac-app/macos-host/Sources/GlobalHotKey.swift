import Cocoa
import Carbon

class GlobalHotKey {
    private var hotKeyRef: EventHotKeyRef? = nil
    private var eventHandler: EventHandlerRef? = nil
    private let callback: () -> Void

    init(modifiers: UInt32, keyCode: UInt32, callback: @escaping () -> Void) {
        self.callback = callback
        register(modifiers: modifiers, keyCode: keyCode)
    }

    deinit { unregister() }

    private func fourCharCode(_ s: String) -> OSType {
        var result: OSType = 0
        for char in s.utf16 { result = (result << 8) + OSType(char) }
        return result
    }

    private func register(modifiers: UInt32, keyCode: UInt32) {
        var gMyHotKeyID = EventHotKeyID(signature: fourCharCode("BNHT"), id: 1) // 'BNHT'

        let handlerUPP: EventHandlerUPP = { (nextHandler, theEvent, userData) in
            let hotKeyIDPtr = UnsafeMutablePointer<EventHotKeyID>.allocate(capacity: 1)
            defer { hotKeyIDPtr.deallocate() }
            GetEventParameter(theEvent, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID), nil, MemoryLayout<EventHotKeyID>.size, nil, hotKeyIDPtr)
            if hotKeyIDPtr.pointee.signature == GlobalHotKey.fourCharCodeStatic("BNHT") {
                let mySelf = Unmanaged<GlobalHotKey>.fromOpaque(userData!).takeUnretainedValue()
                mySelf.callback()
            }
            return noErr
        }

        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetEventDispatcherTarget(), handlerUPP, 1, &eventType, Unmanaged.passUnretained(self).toOpaque(), &self.eventHandler)

        let modifierFlags = modifiers
        RegisterEventHotKey(UInt32(keyCode), modifierFlags, gMyHotKeyID, GetEventDispatcherTarget(), 0, &hotKeyRef)
    }

    private func unregister() {
        if let hk = hotKeyRef { UnregisterEventHotKey(hk) }
        if let eh = eventHandler { RemoveEventHandler(eh) }
    }
}

extension UInt32 {
    static let cmdShift: UInt32 = UInt32(cmdKey) | UInt32(shiftKey)
    static let hyperKey: UInt32 = UInt32(cmdKey) | UInt32(controlKey) | UInt32(optionKey) | UInt32(shiftKey)
}

private extension GlobalHotKey {
    static func fourCharCodeStatic(_ s: String) -> OSType {
        var result: OSType = 0
        for char in s.utf16 { result = (result << 8) + OSType(char) }
        return result
    }
}

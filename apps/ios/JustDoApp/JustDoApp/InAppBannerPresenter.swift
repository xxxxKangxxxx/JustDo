import UIKit

@MainActor
final class InAppBannerPresenter {
    static let shared = InAppBannerPresenter()

    private var currentBanner: UIView?
    private var dismissalWorkItem: DispatchWorkItem?

    private init() {}

    func show(_ message: String) {
        dismiss(animated: false)
        guard let window = activeWindow else {
            return
        }

        let banner = UIView()
        banner.translatesAutoresizingMaskIntoConstraints = false
        banner.backgroundColor = .secondarySystemBackground
        banner.layer.cornerRadius = 14
        banner.layer.cornerCurve = .continuous
        banner.layer.shadowColor = UIColor.black.cgColor
        banner.layer.shadowOpacity = 0.14
        banner.layer.shadowRadius = 14
        banner.layer.shadowOffset = CGSize(width: 0, height: 5)
        banner.accessibilityViewIsModal = false

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = message
        label.textColor = .label
        label.font = .systemFont(ofSize: 14, weight: .semibold)
        label.numberOfLines = 0

        let closeButton = UIButton(type: .system)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeButton.tintColor = .secondaryLabel
        closeButton.addTarget(self, action: #selector(closeButtonTapped), for: .touchUpInside)
        closeButton.accessibilityLabel = "메시지 닫기"

        banner.addSubview(label)
        banner.addSubview(closeButton)
        window.addSubview(banner)

        NSLayoutConstraint.activate([
            banner.topAnchor.constraint(equalTo: window.safeAreaLayoutGuide.topAnchor, constant: 8),
            banner.leadingAnchor.constraint(equalTo: window.leadingAnchor, constant: 20),
            banner.trailingAnchor.constraint(equalTo: window.trailingAnchor, constant: -20),
            label.topAnchor.constraint(equalTo: banner.topAnchor, constant: 14),
            label.leadingAnchor.constraint(equalTo: banner.leadingAnchor, constant: 16),
            label.bottomAnchor.constraint(equalTo: banner.bottomAnchor, constant: -14),
            closeButton.leadingAnchor.constraint(equalTo: label.trailingAnchor, constant: 10),
            closeButton.trailingAnchor.constraint(equalTo: banner.trailingAnchor, constant: -10),
            closeButton.centerYAnchor.constraint(equalTo: banner.centerYAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 34),
            closeButton.heightAnchor.constraint(equalToConstant: 34),
        ])

        currentBanner = banner
        banner.alpha = 0
        banner.transform = CGAffineTransform(translationX: 0, y: -20)
        UIView.animate(withDuration: 0.22) {
            banner.alpha = 1
            banner.transform = .identity
        }

        UIAccessibility.post(notification: .announcement, argument: message)
        let workItem = DispatchWorkItem { [weak self] in
            self?.dismiss(animated: true)
        }
        dismissalWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: workItem)
    }

    func dismiss(animated: Bool = true) {
        dismissalWorkItem?.cancel()
        dismissalWorkItem = nil
        guard let banner = currentBanner else {
            return
        }
        currentBanner = nil
        guard animated else {
            banner.removeFromSuperview()
            return
        }
        UIView.animate(
            withDuration: 0.18,
            animations: {
                banner.alpha = 0
                banner.transform = CGAffineTransform(translationX: 0, y: -16)
            },
            completion: { _ in banner.removeFromSuperview() }
        )
    }

    @objc
    private func closeButtonTapped() {
        dismiss(animated: true)
    }

    private var activeWindow: UIWindow? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes where scene.activationState == .foregroundActive {
            if let keyWindow = scene.windows.first(where: \.isKeyWindow) {
                return keyWindow
            }
            if let window = scene.windows.first(where: { !$0.isHidden }) {
                return window
            }
        }
        return scenes.flatMap(\.windows).first(where: \.isKeyWindow)
    }
}

//
//  JustDoWidgetBundle.swift
//  JustDoWidget
//
//  Created by 강영모 on 4/30/26.
//

import WidgetKit
import SwiftUI

@main
struct JustDoWidgetBundle: WidgetBundle {
    var body: some Widget {
        JustDoWidget()
        JustDoLockScreenWidget()
    }
}

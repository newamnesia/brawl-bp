package com.newam.brawlbp;

import com.getcapacitor.BridgeActivity;
import android.view.WindowManager;

public class MainActivity extends BridgeActivity {
    @Override
    public void onResume() {
        super.onResume();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onPause() {
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }
}

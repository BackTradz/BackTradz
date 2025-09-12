def detect_obm5_rsi_signals(df, rsi_threshold=30):
    signals = []
    in_zone = False

    for i in range(1, len(df)):
        close = df['Close'].iloc[i]
        prev_close = df['Close'].iloc[i - 1]
        rsi = df['RSI'].iloc[i]

        # === DÉTECTION PREMIER OB BULLISH ===
        if not in_zone and close > prev_close and rsi < rsi_threshold:
            ob = df.iloc[i - 1]
            signals.append({
                'time': df.index[i],
                'entry': ob['High'],
                'direction': 'buy'
            })
            in_zone = True

        # === DÉTECTION PREMIER OB BEARISH ===
        if not in_zone and close < prev_close and rsi > (100 - rsi_threshold):
            ob = df.iloc[i - 1]
            signals.append({
                'time': df.index[i],
                'entry': ob['Low'],
                'direction': 'sell'
            })
            in_zone = True

    return signals

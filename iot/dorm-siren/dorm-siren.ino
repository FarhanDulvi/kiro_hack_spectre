/*
 * Perisai dorm siren box (ESP32)
 *
 * Sits in a worker dormitory. Every 60 seconds it asks Perisai whether an
 * official warning covers this dormitory's area. If one does, it lights the
 * LED in the gauge colour (yellow, orange, red) and sounds the buzzer pattern,
 * so workers whose phones are on silent still wake up.
 *
 * Parts: ESP32 dev board, 1 RGB LED (common cathode) + 3 x 220 ohm resistors,
 *        1 active buzzer, optional push button to silence.
 * Libraries: ArduinoJson 7 (Library Manager). WiFi and HTTPClient ship with the ESP32 core.
 *
 * Wiring:  LED R -> GPIO 25, LED G -> GPIO 26, LED B -> GPIO 27, LED GND -> GND
 *          Buzzer + -> GPIO 14, Buzzer - -> GND
 *          Silence button -> GPIO 13 and GND (internal pull-up)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ---- Settings: change these for your site ----
const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASS = "your-password";
// The deployed Perisai URL plus this dormitory's group id.
const char* DEVICE_URL = "https://YOUR-PERISAI-HOST/api/device/kilang-klang";
const unsigned long POLL_MS = 60000;
// ----------------------------------------------

const int PIN_R = 25, PIN_G = 26, PIN_B = 27, PIN_BUZZ = 14, PIN_SILENCE = 13;

String lastAlertId = "";
bool silenced = false;

void setColour(const char* hex) {
  // "#RRGGBB" -> PWM on each channel
  long v = strtol(hex + 1, nullptr, 16);
  analogWrite(PIN_R, (v >> 16) & 0xFF);
  analogWrite(PIN_G, (v >> 8) & 0xFF);
  analogWrite(PIN_B, v & 0xFF);
}

void buzz(JsonArray pattern) {
  // [on ms, off ms, on ms, ...]
  for (size_t i = 0; i < pattern.size(); i++) {
    digitalWrite(PIN_BUZZ, i % 2 == 0 ? HIGH : LOW);
    delay(pattern[i].as<int>());
  }
  digitalWrite(PIN_BUZZ, LOW);
}

void poll() {
  WiFiClientSecure client;
  client.setInsecure();  // Demo only. Pin the server certificate for real use.
  HTTPClient http;
  if (!http.begin(client, DEVICE_URL)) return;
  int code = http.GET();
  if (code != 200) {
    Serial.printf("Perisai answered %d\n", code);
    http.end();
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, http.getStream());
  http.end();
  if (err) {
    Serial.printf("Bad JSON: %s\n", err.c_str());
    return;
  }

  const char* level = doc["level"] | "none";
  const char* led = doc["led"] | "#000000";
  String alertId = doc["alert_id"] | "";
  Serial.printf("Level: %s  Alert: %s\n", level, alertId.c_str());

  setColour(led);
  // Buzz once per new warning, unless someone pressed silence for this one.
  if (alertId.length() && alertId != lastAlertId) {
    silenced = false;
    lastAlertId = alertId;
  }
  if (alertId.length() && !silenced) buzz(doc["buzz"].as<JsonArray>());
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  pinMode(PIN_BUZZ, OUTPUT);
  pinMode(PIN_SILENCE, INPUT_PULLUP);
  setColour("#000000");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    setColour("#0000FF");  // blue blink while connecting
    delay(250);
    setColour("#000000");
    delay(250);
  }
  Serial.println("Connected. Polling Perisai.");
  poll();
}

unsigned long lastPoll = 0;

void loop() {
  if (digitalRead(PIN_SILENCE) == LOW) silenced = true;
  if (millis() - lastPoll >= POLL_MS) {
    lastPoll = millis();
    poll();
  }
  delay(50);
}

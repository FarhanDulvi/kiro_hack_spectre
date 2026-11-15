/*
 * Perisai river-level sensor (ESP32 + HC-SR04 ultrasonic)
 *
 * Mounted on a bridge, pointing down at the water. Every 60 seconds it measures
 * the distance to the water, converts it to a water level, and posts it to
 * Perisai's Watchtower over WiFi. Perisai treats a sensor reading as evidence,
 * never as a warning on its own: an official JPS or MetMalaysia source must agree.
 *
 * Wiring: HC-SR04 VCC -> 5V, GND -> GND, TRIG -> GPIO 5, ECHO -> GPIO 18 (via a
 *         1k/2k divider: ECHO is 5 V, ESP32 pins are 3.3 V)
 * Libraries: ArduinoJson 7. WiFi and HTTPClient ship with the ESP32 core.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ---- Settings: change these for your site ----
const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASS = "your-password";
const char* SENSOR_URL = "https://YOUR-PERISAI-HOST/api/sensor";
const char* DEVICE_KEY = "perisai-demo";       // must match SENSOR_KEY on the server
const char* DEVICE_ID  = "KLG-01";
const char* RIVER      = "Sungai Klang";
const char* STATION    = "Jambatan Kota";
const char* STATE      = "Selangor";            // state name as Perisai spells it
const char* DISTRICT   = "Klang";
const float SENSOR_HEIGHT_M = 9.0;  // height of the sensor above the riverbed datum
const float WASPADA_M = 4.5, AMARAN_M = 4.8, BAHAYA_M = 5.1;  // gauge bands for this station
const unsigned long POST_MS = 60000;
// ----------------------------------------------

const int PIN_TRIG = 5, PIN_ECHO = 18;

float distanceMetres() {
  // Median of 5 pings to ignore ripples and debris.
  float d[5];
  for (int i = 0; i < 5; i++) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);
    unsigned long us = pulseIn(PIN_ECHO, HIGH, 60000);
    d[i] = us ? us * 0.000343f / 2.0f : NAN;
    delay(60);
  }
  for (int i = 0; i < 4; i++)
    for (int j = i + 1; j < 5; j++)
      if (d[j] < d[i]) { float t = d[i]; d[i] = d[j]; d[j] = t; }
  return d[2];
}

void postReading(float level) {
  WiFiClientSecure client;
  client.setInsecure();  // Demo only. Pin the server certificate for real use.
  HTTPClient http;
  if (!http.begin(client, SENSOR_URL)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["river"] = RIVER;
  doc["station"] = STATION;
  doc["state"] = STATE;
  doc["district"] = DISTRICT;
  doc["reading"] = level;
  doc["waspada"] = WASPADA_M;
  doc["amaran"] = AMARAN_M;
  doc["bahaya"] = BAHAYA_M;
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("Posted %.2f m, Perisai answered %d\n", level, code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.println("Connected. Reporting river level to Perisai.");
}

unsigned long lastPost = 0;

void loop() {
  if (lastPost == 0 || millis() - lastPost >= POST_MS) {
    lastPost = millis();
    float d = distanceMetres();
    if (isnan(d)) {
      Serial.println("No echo. Check the sensor.");
    } else {
      postReading(SENSOR_HEIGHT_M - d);
    }
  }
  delay(100);
}

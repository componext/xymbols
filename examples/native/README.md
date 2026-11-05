# xymbols-react-native example

An Expo app for checking `xymbols-react-native/animated` on a device or simulator: tabs that play once and fill when chosen (Menu folds into an X), icons in a loop, and an effect played through a ref.

```bash
pnpm build
(cd packages/react-native && npm pack && mv xymbols-react-native-0.0.0.tgz ../../examples/native/)
cd examples/native && npm install ./xymbols-react-native-0.0.0.tgz && npx expo start --ios
```

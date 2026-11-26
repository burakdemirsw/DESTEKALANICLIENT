// Uygulama sürümü: APP_VERSION_BASE + "." + APP_BUILD_NUMBER (örn. 2.0.0.12).
// APP_BUILD_NUMBER her `ng build`'de (production ve development; watch hariç) tools/build-number tarafından
// bir artırılır; elle değiştirilmez. Ana sürüm atlatılacaksa yalnız APP_VERSION_BASE düzenlenir.
// APP_BUILD_DATE aynı anda build'in yerel tarih / saatiyle yazılır (commit mesajında sürümün yanında görünür).
export const APP_VERSION_BASE = '2.0.0';
export const APP_BUILD_NUMBER = 0;
export const APP_BUILD_DATE = '';
export const APP_VERSION = `${APP_VERSION_BASE}.${APP_BUILD_NUMBER}`;

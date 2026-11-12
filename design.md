# Karo Numune Takip — Mobil Arayüz Tasarım Planı

**Yazar:** Manus AI

Bu tasarım planı, firma numune odasında bulunan karo taşlarının sayım ve takibini mobil portre kullanımına uygun şekilde yönetmek için hazırlanmıştır. Uygulama, tek elle kullanımda hızlı erişim sağlayan, ilk bakışta stok durumunu özetleyen ve numune hareketlerini kayıt altına alan sade bir iOS deneyimi hedefler.

## Tasarım İlkeleri

Uygulama **9:16 mobil portre yöneliminde** ve **tek elle kullanım** varsayımıyla tasarlanacaktır. Ana aksiyonlar ekranın alt yarısına yakın konumlandırılacak, listeler kart tabanlı gösterilecek ve sayım işlemi mümkün olduğunca az dokunuşla tamamlanacaktır. Arayüz dili, iOS ana uygulamalarındaki yalın hiyerarşiye benzer biçimde geniş başlıklar, yuvarlatılmış kartlar, net durum renkleri ve dokunulabilir satırlar üzerine kurulacaktır.

| Tasarım Kararı | Uygulamadaki Karşılığı | Kullanıcı Faydası |
|---|---|---|
| Alt sekmeli gezinme | Özet, Envanter, Hareketler ve Sayım sekmeleri | Numune odasında yürürken hızlı geçiş sağlar. |
| Kart tabanlı stok özeti | Toplam ürün, toplam adet, düşük stok ve son hareket kartları | En önemli bilgiler ilk ekranda görünür. |
| Büyük dokunma alanları | Artır, azalt, hareket kaydet ve sayım tamamla butonları | Eldivenli veya hareket halindeki kullanımda hata riskini azaltır. |
| Yerel kayıt yaklaşımı | Numuneler ve hareketler cihazda saklanır | İnternet veya hesap gerektirmeden hızlı kullanım sağlar. |

## Ekran Listesi

| Ekran | Birincil İçerik ve İşlevsellik | Yerleşim Notları |
|---|---|---|
| **Özet** | Toplam numune çeşidi, toplam karo adedi, düşük stok uyarıları, son üç hareket ve hızlı sayım başlatma | Büyük başlık üstte; metrik kartları iki sütun; hızlı aksiyon alt bölgede. |
| **Envanter** | Karo numune listesi, kategori/ebat/konum bilgisi, mevcut adet, minimum stok seviyesi ve arama | Arama alanı başlığın altında; liste kartları tek sütun; düşük stok kartlarında amber vurgu. |
| **Numune Detayı** | Seçilen karonun adı, kodu, seri/renk, ölçü, raf konumu, adet, minimum stok, notlar ve hareket geçmişi | Modal benzeri detay hissi; kritik bilgiler üst kartta, hareket geçmişi aşağıda. |
| **Numune Ekle / Düzenle** | Ürün adı, kod, kategori, ölçü, renk, yüzey, raf konumu, adet ve minimum stok formu | iOS form grupları; klavye dostu alan sırası; kayıt butonu alt sağda. |
| **Hareketler** | Giriş, çıkış, düzeltme ve sayım farkı kayıtları; tarih, adet ve açıklama | Zaman çizgisi benzeri liste; hareket tipine göre renkli rozet. |
| **Sayım** | Hızlı fiziksel sayım ekranı; numune seçimi, sayılan adet girişi, fark hesaplama ve kayıt | Sayım alanı tek odaklı; sayılan adet için büyük sayı kontrolü. |

## Ana Kullanıcı Akışları

Kullanıcı uygulamayı açtığında önce **Özet** ekranında genel durumu görür. Toplam numune ve düşük stok bilgileri öne çıkarılır. Kullanıcı düşük stok kartına dokunarak filtrelenmiş envanter listesine geçebilir veya hızlı aksiyon üzerinden yeni sayım başlatabilir.

| Akış | Adımlar | Beklenen Sonuç |
|---|---|---|
| Yeni numune ekleme | Envanter → Yeni Numune → Formu doldur → Kaydet | Numune listeye eklenir, ilk stok hareketi otomatik kaydedilir. |
| Stok çıkışı kaydetme | Envanter → Numune kartı → Detay → Çıkış kaydet → Adet ve açıklama gir | Mevcut adet azalır, hareket geçmişine çıkış kaydı eklenir. |
| Fiziksel sayım yapma | Sayım → Numune seç → Sayılan adedi gir → Farkı incele → Sayımı kaydet | Mevcut adet sayılan değere eşitlenir, fark hareket olarak kaydedilir. |
| Düşük stok kontrolü | Özet → Düşük stok kartı → Envanter filtresi | Minimum seviyenin altındaki ürünler hızlıca listelenir. |

## Veri Modeli

Uygulama ilk sürümde yerel cihaz depolamasıyla çalışacaktır. Bu yaklaşım, kullanıcı hesabı veya bulut senkronizasyonu gerektirmeden numune odasında hızlı kayıt tutmaya olanak verir. İleride firma ihtiyacına göre çok kullanıcılı senkronizasyon veya barkod/QR okuma eklenebilir.

| Varlık | Alanlar | Açıklama |
|---|---|---|
| **TileSample** | id, code, name, category, size, color, finish, location, quantity, minimumQuantity, notes, updatedAt | Her karo numune çeşidini temsil eder. |
| **StockMovement** | id, sampleId, type, quantityDelta, resultingQuantity, note, createdAt | Giriş, çıkış, düzeltme ve sayım hareketlerini saklar. |
| **CountSession** | id, sampleId, previousQuantity, countedQuantity, difference, createdAt | Fiziksel sayım sonucunu hareket kaydına dönüştürmek için kullanılır. |

## Renk Seçimleri

Marka dili, seramik ve taş yüzeylerini çağrıştıran sıcak nötr tonlar ile depo/operasyon hissini destekleyen koyu lacivert vurgu üzerine kurulacaktır. Ana renkler, numune odasında okunabilirliği artıracak yüksek kontrastla seçilmiştir.

| Kullanım | Renk | Gerekçe |
|---|---|---|
| Birincil vurgu | **#1F4E5F** | Güvenilir, operasyonel ve kurumsal bir lacivert/teal tonu sağlar. |
| Arka plan | **#F7F3EC** | Karo ve taş yüzeylerini anımsatan sıcak açık zemin oluşturur. |
| Kart yüzeyi | **#FFFFFF** | iOS tarzı temiz kart görünümü sağlar. |
| Başarı / stok girişi | **#2E7D5B** | Stok artışı ve tamamlanan işlem için sakin yeşil vurgu verir. |
| Uyarı / düşük stok | **#C47A21** | Dikkat çeker, ancak agresif kırmızı alarm hissi vermez. |
| Hata / stok yetersiz | **#B23A3A** | Kritik durumlarda net uyarı sağlar. |

## İlk Sürüm Kapsamı

İlk teslimatta uygulama; örnek envanter verileriyle açılan, yeni karo numunesi ekleyebilen, mevcut numunelerde giriş/çıkış/düzeltme hareketleri kaydedebilen, fiziksel sayım farkını hesaplayıp stoğu güncelleyebilen ve verileri cihazda saklayabilen bir yapı içerecektir. Bu sürümde kullanıcı hesabı, bulut veri tabanı ve otomatik barkod/QR okuma yer almayacaktır; çünkü bunlar mevcut talimatta açıkça istenmemiştir.

## Referanslar

Bu belge, kullanıcının sağladığı iş ihtiyacı ve proje içi Expo mobil şablon rehberliği temel alınarak hazırlanmıştır.

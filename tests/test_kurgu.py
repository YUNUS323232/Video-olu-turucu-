"""Uçtan uca testler: ffmpeg ile sentetik videolar üretip kurgu araçlarını çalıştırır.

Çalıştırma: python -m unittest discover tests
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK / "araclar"))

import kurgu  # noqa: E402
import plan_uret  # noqa: E402


def ffmpeg(*arg):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *arg], check=True)


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg yok")
class KurguTesti(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.klasor = Path(tempfile.mkdtemp(prefix="kurgu_test_"))
        k = cls.klasor
        ffmpeg("-f", "lavfi", "-i", "testsrc2=s=1280x720:r=25:d=4",
               "-f", "lavfi", "-i", "sine=f=440:d=4", "-shortest", str(k / "yatay.mp4"))
        ffmpeg("-f", "lavfi", "-i", "testsrc=s=480x832:r=24:d=3", str(k / "sessiz.mp4"))
        ffmpeg("-f", "lavfi", "-i", "color=c=orange:s=600x600:d=1", "-frames:v", "1", str(k / "urun.png"))
        ffmpeg("-f", "lavfi", "-i", "sine=f=220:d=5", str(k / "muzik.mp3"))
        # 0-2 sn ses, 2-4 sessizlik, 4-6 ses
        ffmpeg("-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=6", "-f", "lavfi",
               "-i", "aevalsrc='if(between(t,2,4),0,0.5*sin(2*PI*300*t))':d=6", "-shortest",
               str(k / "konusma.mp4"))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.klasor, ignore_errors=True)

    def test_tam_plan(self):
        plan = {
            "cikti": "cikti/reklam.mp4", "oran": "9:16", "sigdirma": "bulanik",
            "gecis": {"tur": "fade", "sure": 0.5},
            "muzik": {"dosya": "muzik.mp3", "ses": 0.3},
            "klipler": [
                {"dosya": "yatay.mp4", "bas": 1, "son": "0:03",
                 "yazilar": [{"metin": "Yeni ürün: %50 İNDİRİM", "konum": "ust"}]},
                {"dosya": "sessiz.mp4", "hiz": 1.5},
                {"gorsel": "urun.png", "sure": 2},
                {"kart": {"sure": 1.5}, "yazilar": [{"metin": "Hemen al\nornek.com", "konum": "orta"}]},
            ],
        }
        cikti = kurgu.plan_uygula(plan, self.klasor)
        bilgi = kurgu.incele(cikti)
        self.assertEqual((bilgi["genislik"], bilgi["yukseklik"]), (1080, 1920))
        self.assertTrue(bilgi["ses_var"])
        # 2 + 2 + 2 + 1.5 - 3 geçiş * 0.5
        self.assertAlmostEqual(bilgi["sure"], 6.0, delta=0.15)

    def test_gecissiz_birlestirme(self):
        plan = {"cikti": "kare.mp4", "oran": "1:1", "gecis": {"sure": 0},
                "klipler": [{"dosya": "yatay.mp4"}, {"dosya": "sessiz.mp4"}]}
        bilgi = kurgu.incele(kurgu.plan_uygula(plan, self.klasor))
        self.assertEqual((bilgi["genislik"], bilgi["yukseklik"]), (1080, 1080))
        self.assertAlmostEqual(bilgi["sure"], 7.0, delta=0.15)

    def test_sessizlik_kes(self):
        cikti = self.klasor / "temiz.mp4"
        kurgu.sessizlik_kes(self.klasor / "konusma.mp4", cikti)
        # 2 sn sessizlikten iki taraftaki paylar (2 * 0.12) kalır
        self.assertAlmostEqual(kurgu.incele(cikti)["sure"], 4.24, delta=0.2)

    def test_hatali_plan(self):
        with self.assertRaises(kurgu.KurguHatasi):
            kurgu.plan_uygula({"klipler": [{"dosya": "yok.mp4"}]}, self.klasor)
        with self.assertRaises(kurgu.KurguHatasi):
            kurgu.plan_uygula({"oran": "3:2", "klipler": [{"dosya": "yatay.mp4"}]}, self.klasor)

    def test_sure_cevir(self):
        self.assertEqual(kurgu.sure_cevir("1:05"), 65)
        self.assertEqual(kurgu.sure_cevir("00:01:05.5"), 65.5)
        self.assertEqual(kurgu.sure_cevir(3), 3.0)
        self.assertIsNone(kurgu.sure_cevir(None))


class PlanUretTesti(unittest.TestCase):
    def test_ornek_brief(self):
        brief = plan_uret.brief_oku(KOK / "ornekler" / "brief.json")
        plan, kurgu_plani = plan_uret.plan_olustur(brief)
        self.assertEqual(plan["oran"], "9:16")
        self.assertEqual(len(plan["sahneler"]), len(kurgu_plani["klipler"]))
        self.assertAlmostEqual(sum(s["sure"] for s in plan["sahneler"]), brief["sure"], delta=0.5)
        for sahne in plan["sahneler"]:
            self.assertNotIn("{", sahne["prompt"])
        json.dumps(kurgu_plani)


if __name__ == "__main__":
    unittest.main()

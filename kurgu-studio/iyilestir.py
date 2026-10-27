"""Düşük çözünürlüklü videoyu Real-ESRGAN (General x4v3, ONNX) ile 1080x1920'ye büyütür.

Model: Qualcomm AI Hub'daki real_esrgan_general_x4v3 ONNX sürümü; sabit 128x128 girişi
ilk çalıştırmada dinamik boyuta çevrilir (ağ tamamen evrişimli). Yapay zekâ çıktısı
"plastik" görünmesin diye bir miktar Lanczos büyütmesiyle karıştırılır, ardından
hafif renk düzeltmesi yapılır. Ses olduğu gibi kopyalanır.

    python3 iyilestir.py giris.mp4 cikis.mp4 [--karisim 0.8] [--kare 120]
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

KLASOR = Path(__file__).parent / "cikti" / "esrgan" / "qai" / "real_esrgan_general_x4v3-onnx-float"
HEDEF = (1080, 1920)


def model_yukle() -> ort.InferenceSession:
    dinamik = KLASOR / "dinamik.onnx"
    if not dinamik.exists():
        import onnx

        m = onnx.load(KLASOR / "real_esrgan_general_x4v3.onnx")
        for t in (m.graph.input[0], m.graph.output[0]):
            for k, boyut in enumerate(t.type.tensor_type.shape.dim[2:]):
                boyut.ClearField("dim_value")
                boyut.dim_param = f"d{k}{t.name}"
        del m.graph.value_info[:]
        onnx.save(m, dinamik, save_as_external_data=True, location="dinamik.data")
    secenek = ort.SessionOptions()
    secenek.intra_op_num_threads = 4
    return ort.InferenceSession(str(dinamik), secenek, providers=["CPUExecutionProvider"])


def bilgi(yol: str) -> tuple[int, int, str]:
    cikti = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", yol],
        capture_output=True, text=True, check=True,
    ).stdout.strip().split(",")
    return int(cikti[0]), int(cikti[1]), cikti[2]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("giris")
    ap.add_argument("cikis")
    ap.add_argument("--karisim", type=float, default=0.8, help="Yapay zekâ çıktısının ağırlığı (0-1)")
    ap.add_argument("--kare", type=int, default=0, help="Sadece ilk N kareyi işle (deneme için)")
    a = ap.parse_args()

    g, h, fps = bilgi(a.giris)
    model = model_yukle()
    oku = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.giris, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    yaz = subprocess.Popen(
        [
            "ffmpeg", "-v", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{HEDEF[0]}x{HEDEF[1]}", "-r", fps, "-i", "-",
            "-i", a.giris, "-map", "0:v", "-map", "1:a?", "-c:a", "copy",
            # Hafif renk: biraz kontrast, doygunluk ve sıcaklık; ardından ince keskinlik.
            "-vf", "eq=contrast=1.06:saturation=1.12:gamma=1.02,colorbalance=rs=0.02:bs=-0.02,unsharp=5:5:0.35",
            "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            a.cikis,
        ],
        stdin=subprocess.PIPE,
    )
    boyut = g * h * 3
    sayac, bas = 0, time.time()
    while True:
        ham = oku.stdout.read(boyut)
        if len(ham) < boyut or (a.kare and sayac >= a.kare):
            break
        kare = np.frombuffer(ham, np.uint8).reshape(h, g, 3)
        x = kare.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
        y = model.run(None, {"image": x})[0][0].transpose(1, 2, 0)
        y = (np.clip(y, 0, 1) * 255).astype(np.uint8)
        # 4x çıktıyı ve Lanczos büyütmesini hedef boyuta getirip karıştır.
        from PIL import Image

        ai = np.asarray(Image.fromarray(y).resize(HEDEF, Image.LANCZOS), np.float32)
        klasik = np.asarray(Image.fromarray(kare).resize(HEDEF, Image.LANCZOS), np.float32)
        sonuc = np.clip(a.karisim * ai + (1 - a.karisim) * klasik, 0, 255).astype(np.uint8)
        yaz.stdin.write(sonuc.tobytes())
        sayac += 1
        if sayac % 30 == 0:
            gecen = time.time() - bas
            print(f"{sayac} kare, {gecen / sayac:.2f} sn/kare", file=sys.stderr, flush=True)
    oku.kill()
    yaz.stdin.close()
    yaz.wait()
    print(a.cikis)


if __name__ == "__main__":
    main()

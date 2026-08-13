import Image from "next/image";
import Uploader from "@/components/Uploader";

export default function Home() {
  return (
    <main>
      <div className="wrap">
        <header className="hero">
          <h1>
            Generate your <em>social media avatar.</em>
          </h1>
        </header>

        <div className="examples">
          <figure>
            <div className="pic">
              <Image
                src="/examples/example-yi.jpeg"
                alt="Restored childhood portrait of a calm child with short black hair"
                width={520}
                height={520}
              />
            </div>
          </figure>
          <figure>
            <div className="pic">
              <Image
                src="/examples/example-boy.jpeg"
                alt="Restored childhood portrait of a laughing boy with tousled hair"
                width={520}
                height={520}
              />
            </div>
          </figure>
        </div>

        <Uploader />
      </div>
    </main>
  );
}

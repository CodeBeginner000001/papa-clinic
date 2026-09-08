import { useEffect, useState } from "react";

interface AppInfo {
  name: string;
  version: string;
  description: string;
}

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.clinic.app.getInfo().then(setAppInfo);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          {appInfo?.name ?? "Loading..."}
        </h1>

        {appInfo && (
          <>
            <p className="mt-2 text-gray-500">
              Version {appInfo.version}
            </p>

            <p className="mt-4">
              {appInfo.description}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default App;
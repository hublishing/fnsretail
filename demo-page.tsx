"use client"

import { useState } from "react"
import DynamicTable from "./dynamic-table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// Datos de ejemplo para la tabla
const sampleData = [
  {
    id: 1,
    nombre: "Juan Pérez",
    email: "juan@ejemplo.com",
    fechaRegistro: "2023-01-15T10:30:00Z",
    activo: true,
    edad: 28,
    etiquetas: ["cliente", "premium", "nuevo"],
    visitas: 15,
  },
  {
    id: 2,
    nombre: "María López",
    email: "maria@ejemplo.com",
    fechaRegistro: "2022-11-20T14:45:00Z",
    activo: true,
    edad: 34,
    etiquetas: ["cliente", "regular"],
    visitas: 42,
  },
  {
    id: 3,
    nombre: "Carlos Rodríguez",
    email: "carlos@ejemplo.com",
    fechaRegistro: "2023-03-05T09:15:00Z",
    activo: false,
    edad: 45,
    etiquetas: ["cliente", "inactivo"],
    visitas: 3,
  },
  {
    id: 4,
    nombre: "Ana Martínez",
    email: "ana@ejemplo.com",
    fechaRegistro: "2023-02-18T16:20:00Z",
    activo: true,
    edad: 29,
    etiquetas: ["cliente", "premium"],
    visitas: 27,
  },
  {
    id: 5,
    nombre: "Pedro Sánchez",
    email: "pedro@ejemplo.com",
    fechaRegistro: "2022-12-10T11:00:00Z",
    activo: true,
    edad: 38,
    etiquetas: ["cliente", "regular", "promoción"],
    visitas: 19,
  },
  {
    id: 6,
    nombre: "Laura Gómez",
    email: "laura@ejemplo.com",
    fechaRegistro: "2023-04-22T13:40:00Z",
    activo: true,
    edad: 31,
    etiquetas: ["cliente", "nuevo", "referido"],
    visitas: 5,
  },
  {
    id: 7,
    nombre: "Miguel Torres",
    email: "miguel@ejemplo.com",
    fechaRegistro: "2022-10-05T08:50:00Z",
    activo: false,
    edad: 42,
    etiquetas: ["cliente", "inactivo"],
    visitas: 0,
  },
  {
    id: 8,
    nombre: "Sofía Ramírez",
    email: "sofia@ejemplo.com",
    fechaRegistro: "2023-01-30T15:10:00Z",
    activo: true,
    edad: 27,
    etiquetas: ["cliente", "premium", "promoción"],
    visitas: 31,
  },
  {
    id: 9,
    nombre: "Javier Herrera",
    email: "javier@ejemplo.com",
    fechaRegistro: "2022-09-15T10:20:00Z",
    activo: true,
    edad: 36,
    etiquetas: ["cliente", "regular"],
    visitas: 22,
  },
  {
    id: 10,
    nombre: "Elena Castro",
    email: "elena@ejemplo.com",
    fechaRegistro: "2023-05-08T09:30:00Z",
    activo: true,
    edad: 33,
    etiquetas: ["cliente", "nuevo"],
    visitas: 8,
  },
  {
    id: 11,
    nombre: "Roberto Díaz",
    email: "roberto@ejemplo.com",
    fechaRegistro: "2022-08-20T14:15:00Z",
    activo: false,
    edad: 47,
    etiquetas: ["cliente", "inactivo"],
    visitas: 1,
  },
  {
    id: 12,
    nombre: "Carmen Vargas",
    email: "carmen@ejemplo.com",
    fechaRegistro: "2023-02-05T11:45:00Z",
    activo: true,
    edad: 30,
    etiquetas: ["cliente", "premium", "referido"],
    visitas: 39,
  },
]

// Columnas personalizadas para la tabla
const customColumns = [
  { key: "id", label: "ID", type: "number", sortable: true },
  { key: "nombre", label: "Nombre", type: "string", sortable: true },
  { key: "email", label: "Correo Electrónico", type: "string", sortable: true },
  { key: "fechaRegistro", label: "Fecha de Registro", type: "date", sortable: true },
  { key: "activo", label: "Estado", type: "boolean", sortable: true },
  { key: "edad", label: "Edad", type: "number", sortable: true },
  { key: "etiquetas", label: "Etiquetas", type: "array", sortable: false },
  { key: "visitas", label: "Visitas", type: "number", sortable: true },
]

export default function DemoPage() {
  const [jsonInput, setJsonInput] = useState("")
  const [tableData, setTableData] = useState(sampleData)
  const [error, setError] = useState("")
  const [useCustomColumns, setUseCustomColumns] = useState(true)

  // Cargar datos JSON personalizados
  const handleLoadJson = () => {
    try {
      const parsedData = JSON.parse(jsonInput)
      if (!Array.isArray(parsedData)) {
        throw new Error("Los datos deben ser un array de objetos")
      }
      setTableData(parsedData)
      setError("")
    } catch (err) {
      setError("Error al parsear JSON: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Restablecer datos de ejemplo
  const handleResetData = () => {
    setTableData(sampleData)
    setJsonInput("")
    setError("")
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Tabla Dinámica</CardTitle>
          <CardDescription>
            Una tabla que se construye dinámicamente, detecta tipos de datos, permite ordenar, paginar, filtrar y
            agrupar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table">
            <TabsList className="mb-4">
              <TabsTrigger value="table">Tabla</TabsTrigger>
              <TabsTrigger value="data">Datos</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Button variant={useCustomColumns ? "default" : "outline"} onClick={() => setUseCustomColumns(true)}>
                  Columnas Personalizadas
                </Button>
                <Button variant={!useCustomColumns ? "default" : "outline"} onClick={() => setUseCustomColumns(false)}>
                  Detección Automática
                </Button>
              </div>

              <DynamicTable
                data={tableData}
                columns={useCustomColumns ? customColumns : undefined}
                pageSize={5}
                filterable={true}
                groupable={true}
              />
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonInput">Datos JSON (array de objetos)</Label>
                <div className="grid gap-4">
                  <textarea
                    id="jsonInput"
                    className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder='[{"id": 1, "nombre": "Ejemplo", "edad": 30}]'
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex space-x-2">
                    <Button onClick={handleLoadJson}>Cargar JSON</Button>
                    <Button variant="outline" onClick={handleResetData}>
                      Restablecer Datos
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}


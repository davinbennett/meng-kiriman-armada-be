import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole)

// Endpoint root untuk cek server
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// tambah akun
app.post('/create-user', async (req, res) => {
    const { username, password, role } = req.body
    const email = `${username}@dummy.internal`  // auto-generate email

    try {
        // 1) Tambah user ke Auth
        const { data: authUser, error: authErr } =
            await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true
            })

        if (authErr) return res.status(400).json({ error: `1: ${authErr.message}` })

        // 2) Tambah ke tabel users
        const { data, error: tableErr } = await supabaseAdmin
            .from('users')
            .insert({
                username: username,
                role: role,
                auth_user_id: authUser.user.id
            })

        if (tableErr) return res.status(400).json({ error: `2: ${tableErr.message}` })

        res.json({ 
            success: true, 
            user: {
                id: authUser.user.id,
                username: username,
                role: role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})


// Endpoint delete user
app.post('/delete-user', async (req, res) => {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })

    try {
        // 1) Hapus dari Auth
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (authErr) return res.status(500).json({ error: authErr.message })

        // 2) Hapus dari tabel users
        const { error: tableErr } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('auth_user_id', userId)
        if (tableErr) return res.status(500).json({ error: tableErr.message })

        res.json({ success: true, message: 'User berhasil dihapus' })
    } catch (err) {
        console.error(err) 
        res.status(500).json({ error: 'Terjadi kesalahan server' })
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
